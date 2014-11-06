/**
 * This file is part of MolView (https://molview.org)
 * Copyright (c) 2014, Herman Bergwerf
 *
 * MolView is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * MolView is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with MolView.  If not, see <http://www.gnu.org/licenses/>.
 */

function MPAtom()
{
	this.position = { x: 0, y: 0 };//atom center
	this.element = "C";
	this.charge = 0;
	this.isotope = 0;
	this.bonds = [];
	this.state = "normal";
}

/**
 * Data
 */

MPAtom.prototype.getPosition = function() { return this.position; }
MPAtom.prototype.setPosition = function(position) { this.position = position; }

MPAtom.prototype.getElement = function() { return this.element; }
MPAtom.prototype.setElement = function(element)
{
	this.element = element == "D" ? "H" : element;
}

MPAtom.prototype.getCharge = function() { return this.charge; }
MPAtom.prototype.setCharge = function(charge) { this.charge = charge; }

MPAtom.prototype.getIsotope = function() { return this.isotope; }
MPAtom.prototype.setIsotope = function(isotope) { this.isotope = isotope; }

MPAtom.prototype.addBond = function(bond)
{
	this.bonds.push(bond);
}

/**
 * Sets state and returs wether the state has changed
 * @param  {String} state
 * @return {Boolean}
 */
MPAtom.prototype.setState = function(state)
{
	var changed = this.oldState != state;
	this.state = state;
	this.oldState = this.state;
	return changed;
}

/**
 * Resets state to normal in case this.handle is not reached by the
 * hoverHandler (in this case, the state is drawn as normal and in the
 * next hoverHandler cycle, this.oldState will become normal)
 * Saves the old state in this.oldState to check the state change in
 * this.setState later
 */
MPAtom.prototype.resetState = function()
{
	this.oldState = this.state;
	this.state = "normal";
}

MPAtom.prototype.translate = function(x, y)
{
	this.position.x += x;
	this.position.y += y;
}

/**
 * Calculations
 */

/**
 * Returns MPAtom area as a line with a surrounding area defined by a radius
 * (area border: d(P, line) = r) + label drawing box
 * @return {Object} Area line or point:
 *                  { from: { x: 0, y: 0 }} or
 *                  { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }
 *                  Label drawing box:
 *                  { offsetLeft: 0, offsetTop: 0 }
 */
MPAtom.prototype.getCenterLine = function(mp)
{
	var scale = mp.settings.atom.scale;
	this.setFont(mp, scale, "label");
	var w = mp.ctx.measureText(this.element).width;
	var h = mp.settings.atom.label.fontSize * scale;
	var halfw = w / 2;
	var text = { offsetLeft: -halfw, offsetTop: h / 2 };

	if(w > mp.settings.atom.circleClamp)
	{
		var pad = mp.settings.atom.radius * scale - h / 2;
		return {
			text: text,
			area: {
				left: { x: this.position.x - halfw + pad, y: this.position.y },
				right: { x: this.position.x + halfw - pad, y: this.position.y }
			}
		}
	}
	else
	{
		return {
			text: text,
			area: { point: this.position }
		}
	}
}

/**
 * Calculate bond attach vertices for a bond from $begin to $this.position
 * @param  {CanvasRenderingContext2D}
 * @param  {Object}
 * @param  {Object}
 * @param  {Object} begin Beginning of line
 * @param  {Array}  ends  Requested end vertices perpendicular to the end of line $begin$this.position
 *                        (values are in counter clockwise direction)
 * @return {Array}        Calculated ends
 */
MPAtom.prototype.calculateBondVertices = function(mp, begin, ends)
{
	var line = this.getCenterLine(mp)

	//TODO: implement bonding site for collapsed groups (only left or right)

	if(!this.isVisible(mp))
	{
		/**
		 * TODO: implement full skeleton display
		 * double/triple bonds inside ring
		 * wedge bonds perfect fit
		 */

		if(ends.length == 1 && ends[0] == 0)
		{
			return [{ x: this.position.x, y: this.position.y }];
		}
		else
		{
			var dx = begin.x - this.position.x;
			var dy = begin.y - this.position.y;
			var d = Math.sqrt(dx * dx + dy * dy);
			var A = dx / d;//dx = a = A * c = d
			var B = dy / d;//dy = b = B * c = d

			var ret = [];
			for(var i = 0; i < ends.length; i++)
			{
				ret.push({
					x: -B * ends[i],
					y: A * ends[i]
				});
			}

			//TODO: perfect fit for double/triple bond

			//translate to real position
			for(var i = 0; i < ret.length; i++)
			{
				ret[i].x += this.position.x;
				ret[i].y += this.position.y;
			}

			return ret;
		}
	}
	else if(begin.x == this.position.x)
	{
		var ret = [];
		var below = begin.y < this.position.y;
		for(var i = 0; i < ends.length; i++)
		{
			ret.push({
				x: this.position.x + (below ? ends[i] : -ends[i]),//counter clockwise
				y: this.position.y + (below ? -mp.settings.atom.radius
											: mp.settings.atom.radius)
			});
		}
		return ret;
	}
	else if(begin.y == this.position.y)
	{
		var ret = [];
		var right = begin.x > this.position.x;
		for(var i = 0; i < ends.length; i++)
		{
			ret.push({
				x: this.position.x + (right ? mp.settings.atom.radius
											: -mp.settings.atom.radius),
				y: this.position.y + (right ? ends[i] : -ends[i])//counter clockwise
			});
		}
		return ret;
	}
	else
	{
		/**
		 * Super awesome MATH!!
		 */

		var ac = this.position;//aligin center
		var bc = this.position;//bond center
		var tdir = 1;//tangent direction

		if(line.area.left && begin.x < this.position.x)
		{
			ac = line.area.left;
		}
		else if(line.area.right && begin.x > this.position.x)
		{
			ac = line.area.right;
			tdir = -1;
		}

		var acbc = Math.abs(ac.x - bc.x);//distance between align center and bond center
		var r = mp.settings.atom.radius;
		var dx = begin.x - bc.x;
		var dy = begin.y - bc.y;
		var d = Math.sqrt(dx * dx + dy * dy);
		var A = dx / d;//dx = a = A * c = d
		var B = dy / d;//dy = b = B * c = d

		//alignCenter tangent crossing with bond line
		var td = (tdir > 0 ? r - A * acbc : r + A * acbc);
		var tx = A * td;
		var ty = B * td;

		var x = bc.x + tx;
		var y = bc.y + ty;

		var ret = [];
		for(var i = 0; i < ends.length; i++)
		{
			ret.push({
				x: x - B * ends[i],
				y: y + A * ends[i]
			});
		}
		return ret;
	}
}

MPAtom.prototype.isVisible = function(mp)
{
	if(mp.settings.drawSkeletonFormula)
	{
		if(this.element == "C")
		{
			var singleBonds = 0;
			for(var i = 0; i < this.bonds.length; i++)
			{
				if(mp.molecule.bonds[this.bonds[i]].getType() ==
						MP_BOND_SINGLE) singleBonds++;
			}
			return (this.bonds.length - singleBonds) > 1;
		}
		return true;
	}
	else return true;
}

/**
 * Render methods
 */

MPAtom.prototype.setFont = function(mp, scale, type)
{
	mp.ctx.font = mp.settings.atom[type].fontStyle + " " +
			(mp.settings.atom[type].fontSize * scale) + "pt " +
			mp.settings.atom[type].fontFamily;
}

MPAtom.prototype.drawStateColor = function(mp)
{
	if(this.state == "hover" || this.state == "active")
	{
		var scale = mp.settings.atom.scale;
		var line = this.getCenterLine(mp);

		mp.ctx.beginPath();
		if(line.area.point)
		{
			mp.ctx.arc(line.area.point.x, line.area.point.y,
					mp.settings.atom[this.state].radius * scale, 0, 2 * Math.PI);

			mp.ctx.fillStyle = mp.settings.atom[this.state].color;
			mp.ctx.fill();
		}
		else
		{
			mp.ctx.moveTo(line.area.left.x, line.area.left.y + .5);
			mp.ctx.lineTo(line.area.right.x, line.area.right.y + .5);

			mp.ctx.strokeStyle = mp.settings.atom[this.state].color;
			mp.ctx.lineWidth = 2 * mp.settings.atom[this.state].radius * scale;
			mp.ctx.lineCap = mp.settings.atom[this.state].lineCap;
			mp.ctx.stroke();
		}
	}
}

MPAtom.prototype.drawLabel = function(mp)
{
	//TODO: add support for collapsed groups (CH2- to H2C-, OH- to HO-, etc.)
	//TODO: add support for charge and isotope display

	if(this.isVisible(mp))
	{
		var scale = mp.settings.atom.scale;
		var line = this.getCenterLine(mp);

		mp.ctx.fillStyle = JmolAtomColorsCSS[this.element];
		this.setFont(mp, scale, "label");

		mp.ctx.fillText(this.element, this.position.x + line.text.offsetLeft,
					this.position.y + line.text.offsetTop);
	}
}

/**
* Event handlers
*/

MPAtom.prototype.getHandler = function()
{
	var scope = this;
	return {
		onPointerMove: function(e)
		{
			e.preventDefault();
			this.setCursor("move");
			var p = this.getRelativeCoords(getPointerCoords(e));
			scope.translate(p.x - this.pointer.oldr.x, p.y - this.pointer.oldr.y);
			this.pointer.oldr.x = p.x;
			this.pointer.oldr.y = p.y;
			this.redraw();
		}
	}
}

MPAtom.prototype.handle = function(mp, point, type)
{
	var line = this.getCenterLine(mp);
	var r = mp.settings.atom[type].radius * mp.settings.atom.scale;

	if(line.area.point)
	{
		if(fastPointInCircleBox(point, line.area.point, r))
		{
			var d = pointToPointDistance(point, line.area.point);
			if(d <= r)
			{
				return { hit: true, redraw: this.setState(type) };
			}
		}
	}
	else
	{
		if(fastPointInLineBox(point, line.area.left, line.area.right, r))
		{
			var d = pointToLineDistance(point, line.area.left, line.area.right)
			if(d <= r)
			{
				return { hit: true, redraw: this.setState(type) };
			}
		}
	}

	return { hit: false, redraw: this.setState("normal") };
}

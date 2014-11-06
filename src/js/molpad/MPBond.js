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

var MP_BOND_SINGLE = 1;
var MP_BOND_DOUBLE = 2;
var MP_BOND_TRIPLE = 3;
var MP_BOND_WEDGEHASH = 4;

var MP_STEREO_NONE = 0;
var MP_STEREO_UP = 1;
var MP_STEREO_DOWN = 6;
var MP_STEREO_CIS_TRANS = 3;
var MP_STEREO_EITHER = 4;

function MPBond()
{
	this.type = 0;
	this.stereo = 0;
	this.from = 0;
	this.to = 0;
	this.state = "normal";
}

/**
* Data
*/

MPBond.prototype.getType = function() { return this.type; }
MPBond.prototype.setType = function(type) { this.type = type; }

MPBond.prototype.getStereo = function() { return this.stereo; }
MPBond.prototype.setStereo = function(stereo) { this.stereo = stereo; }

MPBond.prototype.getFrom = function() { return this.from; }
MPBond.prototype.setFrom = function(from) { this.from = from; }

MPBond.prototype.getTo = function() { return this.to; }
MPBond.prototype.setTo = function(to) { this.to = to; }

MPBond.prototype.calculateBondVertices = function(mp, begin, type, which)
{
	if(this.bondVC[type] && this.bondVC[type][which])
	{
		return this.bondVC[type][which];
	}
	else
	{
		//TODO: finish bond vertices caching
		if(!this.bondVC[type]) this.bondVC[type] = {};
		this.bondVC[type][which] = mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, [0])
		return this.bondVC[type];
	}
}

/**
* Sets state and returs wether the state has changed
* @param  {String} state
* @return {Boolean}
*/
MPBond.prototype.setState = function(state)
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
MPBond.prototype.resetState = function()
{
	this.oldState = this.state;
	this.state = "normal";
}

/**
 * Calculations
 */

MPBond.prototype.getCenterLine = function(mp)
{
	return {
		from: mp.molecule.atoms[this.from].getPosition(),
		to: mp.molecule.atoms[this.to].getPosition()
	};
}

/**
* Render methods
*/

MPBond.prototype.drawStateColor = function(mp)
{
	if(this.state == "hover" || this.state == "active")
	{
		var line = this.getCenterLine(mp);
		var from = mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, [0]);
		var to = mp.molecule.atoms[this.to].calculateBondVertices(mp, line.from, [0]);

		mp.ctx.beginPath();
		mp.ctx.moveTo(from[0].x, from[0].y + .5);//add .5 to fix blurry lines
		mp.ctx.lineTo(to[0].x, to[0].y + .5);

		mp.ctx.strokeStyle = mp.settings.bond[this.state].color;
		mp.ctx.lineWidth = 2 * mp.settings.bond[this.state].radius * mp.settings.bond.scale;
		mp.ctx.lineCap = mp.settings.bond[this.state].lineCap;
		mp.ctx.stroke();
	}
}

MPBond.prototype.drawBond = function(mp)
{
	var scale = mp.settings.bond.scale;
	var line = this.getCenterLine(mp);

	if(this.stereo == MP_STEREO_CIS_TRANS && this.type == MP_BOND_DOUBLE)
	{
		var ends = mp.settings.bond.delta[MP_BOND_DOUBLE];
		var from = mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, ends);
		var to = mp.molecule.atoms[this.to].calculateBondVertices(mp, line.from, ends);

		mp.ctx.beginPath();
		for(var i = 0; i < from.length; i++)
		{
			mp.ctx.moveTo(from[i].x, from[i].y + .5);
			mp.ctx.lineTo(to[i].x, to[i].y + .5);
		}

		mp.ctx.strokeStyle = mp.settings.bond.color;
		mp.ctx.lineWidth = mp.settings.bond.width * scale;
		mp.ctx.lineCap = mp.settings.bond.lineCap;
		mp.ctx.stroke();
	}
	else if(this.stereo == MP_STEREO_UP)//wedge bond
	{
		var far = mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, [0]);
		var near = mp.molecule.atoms[this.to].calculateBondVertices(mp, line.from, mp.settings.bond.delta[MP_BOND_WEDGEHASH]);

		mp.ctx.beginPath();
		mp.ctx.moveTo(far[0].x, far[0].y + .5);
		mp.ctx.lineTo(near[0].x, near[0].y + .5);
		mp.ctx.lineTo(near[1].x, near[1].y + .5);
		mp.ctx.closePath();

		mp.ctx.fillStyle = mp.settings.bond.color;
		mp.ctx.lineWidth = mp.settings.bond.width * scale;
		mp.ctx.lineCap = mp.settings.bond.lineCap;
		mp.ctx.lineJoin = mp.settings.bond.lineCap;
		mp.ctx.fill();
		if(!mp.settings.minimal) mp.ctx.stroke();
	}
	else if(this.stereo == MP_STEREO_DOWN)//hash bond
	{
		var far = mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, [0]);
		var near = mp.molecule.atoms[this.to].calculateBondVertices(mp, lien.from, mp.settings.bond.delta[MP_BOND_WEDGEHASH]);

		var dx1 = near[0].x - far[0].x;
		var dy1 = near[0].y - far[0].y;
		var dx2 = near[1].x - far[0].x;
		var dy2 = near[1].y - far[0].y;
		var d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
		var w = mp.settings.bond.width * scale;
		var s = mp.settings.bond.hashLineSpace * scale;

		mp.ctx.beginPath();
		while(d1 - s - w > 0)
		{
			var mult = (d1 - s - w) / d1;
			d1 *= mult;
			dx1 *= mult; dy1 *= mult;
			dx2 *= mult; dy2 *= mult;

			mp.ctx.moveTo(far[0].x + dx1, far[0].y + dy1 + .5);
			mp.ctx.lineTo(far[0].x + dx2, far[0].y + dy2 + .5);
		}

		mp.ctx.strokeStyle = mp.settings.bond.color;
		mp.ctx.lineWidth = mp.settings.bond.width * scale;
		mp.ctx.lineCap = mp.settings.bond.lineCap;
		mp.ctx.stroke();
	}
	else if(this.type > 0 && this.type <= MP_BOND_TRIPLE)
	{
		var ends = mp.settings.bond.delta[this.type];
		var from = mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, ends);
		var to = mp.molecule.atoms[this.to].calculateBondVertices(mp, line.from, ends.reverse());

		mp.ctx.beginPath();
		for(var i = 0; i < from.length; i++)
		{
			mp.ctx.moveTo(from[i].x, from[i].y + .5);
			mp.ctx.lineTo(to[i].x, to[i].y + .5);
		}

		mp.ctx.strokeStyle = mp.settings.bond.color;
		mp.ctx.lineWidth = mp.settings.bond.width * scale;
		mp.ctx.lineCap = mp.settings.bond.lineCap;
		mp.ctx.stroke();
	}
}

/**
* Event handlers
*/

MPBond.prototype.getHandler = function()
{
	var scope = this;
	return {
		onPointerMove: function(e)
		{
			e.preventDefault();
			this.setCursor("move");
			var p = this.getRelativeCoords(getPointerCoords(e));
			var dx = p.x - this.pointer.oldr.x;
			var dy = p.y - this.pointer.oldr.y;
			this.molecule.atoms[scope.from].translate(dx, dy);
			this.molecule.atoms[scope.to].translate(dx, dy);
			this.pointer.oldr.x = p.x;
			this.pointer.oldr.y = p.y;
			this.redraw();
		}
	}
}

MPBond.prototype.handle = function(mp, point, type)
{
	var line = this.getCenterLine(mp);
	var r = mp.settings.bond[type].radius * mp.settings.bond.scale;

	if(fastPointInLineBox(point, line.from, line.to, r))
	{
		var d = pointToLineDistance(point, line.from, line.to);
		if(d <= r)
		{
			if(type == "active")
			{
				mp.molecule.atoms[this.from].setState("active");
				mp.molecule.atoms[this.to].setState("active");
			}
			return { hit: true, redraw: this.setState(type) };
		}
	}

	return { hit: false, redraw: this.setState("normal") };
}

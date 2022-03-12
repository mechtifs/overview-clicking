/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
'use strict';

const IconGrid = imports.ui.iconGrid;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;

const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/*
 * Main.overview._overview._controls.layout_manager._stateAdjustment.value
 * { 0: "hidden", 1: "workspaces", 2: "apps" }
 *
 * Main.overview.show()
 * Main.overview.hide()
 * Main.overview.toggle()
 *
 * Main.overview.showApps()
 * Main.overview._overview._controls._toggleAppsPage()
 */
class ClickToCloseOverview {
	enable() {
		/* connections to undo when disabling go here */
		this._connections = [];

		/* make the overview susceptible to clicks */
		this._oldReactivity = Main.overview._overview._controls.reactive;
		Main.overview._overview._controls.reactive = true;

		/* create new click action */
		this._clickAaction = new Clutter.ClickAction();
		const callback = this._clickAaction.connect('clicked', action => {
			/* ignore clicks when showing other app pages */
			const appDisplay = Main.overview._overview._controls._appDisplay;
			const showingPrevPage = appDisplay._prevPageIndicator.visible;
			const showingNextPage = appDisplay._nextPageIndicator.visible;
			if (showingPrevPage || showingNextPage) {
				/* Workaround: GS is not setting these values to false after
				 * changing app page. */
				appDisplay._prevPageIndicator.visible = false;
				appDisplay._nextPageIndicator.visible = false;
				return;
			}

			/* clicked actor */
			const [x, y] = global.get_pointer();
			const actor = global.stage.get_actor_at_pos(Clutter.PickMode.ALL, x, y);

			/* ignore clicks inside search box */
			const searchBox = Main.overview._overview._controls._searchEntry;
			if (actor === searchBox || actor.get_parent() === searchBox
					|| actor.get_parent().get_parent() === searchBox)
				return;

			/* propagate clicks inside thumbnails box */
			const thumbnailsBox = Main.overview._overview._controls._thumbnailsBox;
			if (actor.get_parent().get_parent() === thumbnailsBox)
				return actor.get_parent().activate();

			/* check button */
			if (action.get_button() == 1) {
				Main.overview.toggle();
			} else if (action.get_button() == 3) {
				Main.overview._overview._controls._toggleAppsPage()
			}
		});
		/* connect click action to the overview */
		Main.overview._overview._controls.add_action(this._clickAaction);
		this._connections.push([this._clickAaction, callback]);
	}

	disable() {
		/* restore overview reactivity */
		Main.overview._overview._controls.reactive = this._oldReactivity;
		this._oldReactivity = null;

		/* disconnect callbacks */
		this._connections.forEach(([obj, callback]) => obj.disconnect(callback));
		this._connections = null;

		/* disconnect click action from the overview */
		Main.overview._overview._controls.remove_action(this._clickAaction);
		this._clickAaction = null;
	}
}

function init() {
	return new ClickToCloseOverview();
}

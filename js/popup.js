const MAX_RECENT_ROOMS = 3;

var $ = document.querySelector.bind(document);

function roomNameToUrl(name) {
	name = String(name);
	var path = name.indexOf('/') == 0 ? name : '/' + name;
	return 'https://appear.in' + path;
}

function generateRandomRoomName() {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const roomNameLength = 16;
	var roomName = '';
	for (var index = 0; index < roomNameLength; index++) {
		var randomIndex = Math.round(Math.random() * (alphabet.length - 1));
		var character = alphabet[randomIndex];
		roomName += character;
	}
	return roomName;
}

function getRandomUnusedRoomName(url) {
	return new Promise(function(resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open('post', 'https://api.appear.in/random-room-name', true);
		xhr.responseType = 'json';
		xhr.onload = function() {
			var status = xhr.status;
			if (status == 200) {
				resolve(xhr.response.roomName.slice(1));
			} else {
				reject(status);
			}
		};
		xhr.onerror = function() {
			reject();
		};
		xhr.send();
	});
}

function addRecentRoom(name) {
	// Prepend the room name to the list of recent rooms in `localStorage`.
	var index = recentRooms.indexOf(name);
	// If the room name is already in the list and is not the first (i.e. most
	// recent) item, remove the old entry from the list, and prepend a new one.
	if (index > 0) {
		recentRooms.splice(index, 1);
		recentRooms.unshift(name);
	}
	// If the room name was not yet in the list, prepend it to the list.
	if (index == -1) {
		recentRooms.unshift(name);
	}
	// Limit the list to just a few items.
	recentRooms.splice(MAX_RECENT_ROOMS);

	// Update the list
	elRecentRooms.classList.remove('hide');
	elRecentRoomsList.innerHTML = template(roomListItemTemplate, {
		'url': roomNameToUrl(name),
		'name': name
	}) + elRecentRoomsList.innerHTML;
	var extraElement = $('li:nth-child(n+' + (MAX_RECENT_ROOMS + 1) + ')');
	if (extraElement) {
		extraElement.remove();
	}

	localStorage.recentRooms = JSON.stringify(recentRooms);
}

function htmlEscape(string) {
	return String(string)
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
		.replace(/`/g, '&grave;');
}

function template(html, dictionary) {
	for (var key in dictionary) {
		html = html.replace(
			RegExp('\\{\\{' + key + '\\}\\}', 'g'),
			htmlEscape(dictionary[key])
		);
	}
	return html;
}

function selectContents(element) {
	var selection = window.getSelection();
	var range = new Range();
	range.selectNodeContents(element);
	selection.removeAllRanges();
	selection.addRange(range);
}

// Translate the content before doing anything else.
[].forEach.call(document.querySelectorAll('[data-translate]'), function(element) {
	element.innerHTML = chrome.i18n.getMessage(element.dataset.translate);
});

var elOpenRoom = $('.open-room');
var elRoomUrl = $('.room-url');
var elRoomName = $('.room-name');
function updateRoomName(name) {
	// Make the “open room” link point to the URL for this room.
	var url = roomNameToUrl(name);
	elOpenRoom.href = url;
	// Display the URL, and select it for easy copy-pasting.
	elRoomName.textContent = name;
	selectContents(elRoomUrl);
}

var recentRooms = localStorage.recentRooms ?
	JSON.parse(localStorage.recentRooms) :
	[];

const isMac = /Mac/.test(navigator.platform);
$('.modifier-key').textContent = isMac ? '\u2318' : 'Ctrl';

// Generate a random room name (not guaranteed to be available) while we wait
// for the Ajax request to finish.
updateRoomName(generateRandomRoomName());

var elRoomNameInput = $('.room-name-input');
elRoomName.onclick = function() {
	elRoomNameInput.classList.remove('hide');
	elRoomNameInput.focus();
	elRoomName.classList.add('hide');
};
elRoomNameInput.onblur = function() {
	var name = elRoomNameInput.value.replace(/[^a-z0-9-]/g, '').trim();
	elRoomName.classList.remove('hide');
	elRoomNameInput.classList.add('hide');
	if (name) {
		updateRoomName(name);
	}
};
elRoomNameInput.onkeypress = function(event) {
	if (event.keyCode == 0x0D) {
		elRoomNameInput.blur();
	}
};

var elOpenRoom = $('.open-room');
var elRoomUrl = $('.room-url');
$('.url-prefix').onclick = function() {
	selectContents(elRoomUrl);
};

getRandomUnusedRoomName().then(function(name) {
	updateRoomName(name);
}, function(status) {
	console.warn('appear.in couldn\u2019t be reached. Check your network connection.');
	// Fall back to selecting the randomly generated room name.
	selectContents(elRoomUrl);
});

var roomListItemTemplate = $('#template-room-list-item').innerHTML;
var elRecentRooms = $('.recent-rooms');
var elRecentRoomsList = $('.recent-rooms-list');
if (recentRooms.length) {
	elRecentRooms.classList.remove('hide');
	var fragment = document.createDocumentFragment();
	var html = recentRooms.reduce(function(previousValue, name) {
		return previousValue + template(roomListItemTemplate, {
			'url': roomNameToUrl(name),
			'name': name
		});
	}, '');
	elRecentRoomsList.innerHTML = html;
}

document.onclick = function(event) {
	var target = event.target;
	if (target.matches('.remove-list-item')) {
		event.preventDefault();
		var name = target.dataset.name;
		target.parentNode.remove();
		var index = recentRooms.indexOf(name);
		recentRooms.splice(index, 1);
		localStorage.recentRooms = JSON.stringify(recentRooms);
		if (!recentRooms.length) {
			elRecentRooms.classList.add('hide');
		}
	}
};

// Update the recent rooms list whenever an appear.in room is visited.
// See `track-recent-rooms.js` and `background.js`.
chrome.runtime.getBackgroundPage(function(eventPage) {
	eventPage.list.forEach(addRecentRoom);
	eventPage.clearList();
});

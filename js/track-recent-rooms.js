setTimeout(function() {
	if (document.querySelector('.room-url')) {
		// This is a room page. Add it to the list of recent rooms.
		var roomName = location.pathname.slice(1);
		chrome.runtime.sendMessage({
			'name': roomName,
			'from': 'appear-in-room-url'
		});
	}
}, 3000);

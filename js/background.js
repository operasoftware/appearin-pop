var list = [];

chrome.runtime.onMessage.addListener(function(message, sender) {
	if (message.from == 'appear-in-room-url') {
		var roomName = message.name;
		list.push(roomName);
	}
});

function clearList() {
	list = [];
}

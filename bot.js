// Simple XMPP + Node.js chat bot excercise built with node-xmpp.
//   https://github.com/astro/node-xmpp
//
// This is a really good introductory guide to XMPP:
//   http://www.adarshr.com/papers/xmpp

require.paths.unshift(__dirname + '/node_modules');
xmpp = require('node-xmpp');
sys = require('sys');

function main () {
  var argv = process.argv;
  var botName = 'bender';
  var jid = argv[2];
  var password = argv[3];
  var joinRoom = argv[4];

  if (argv.length != 5) {
      sys.puts('Usage: node ' + argv[1] + ' <my-jid> <my-password> <room@domain>');
      process.exit(1);
  }

  var bot = new Client();
  bot.connect('bender', jid, password, function () {
     var room = bot.join(joinRoom); 
     room.onMessage = function (stanza) {
       var message = parseMessage(stanza);
       if (message.body.match(new RegExp("\\b" + botName + "\\b"))) {
         room.say("Got a message on " + message.room + " from " + message.nick +":\n"+message.body);
       }
     }
     room.say("I'm Bender, Baby, please insert liquor!");
  });
}

function parseMessage (stanza) {
   var fromParts = stanza.attrs.from.split('/');
   return { room: fromParts[0]
          , nick: fromParts[1]
          , body: stanza.getChild('body').children[0]
          };
}

function Client ()  {
  this.connection = null;
}

// Connect to XMPP.
Client.prototype.connect = function (nick, jid, password, callback) {
  var self = this;
  self.botJID = jid + '/' + nick;
  self.nick = nick;
  self.jid = jid;
  self.connection = new xmpp.Client({ jid: self.botJID, password: password });
  self.rooms = {};

  self.connection.on('online', onOnline);

  function onOnline () {
    self.connection.on('stanza', onStanza);

    var elem = (new xmpp.Element('presence', { type: 'chat'}))
        .c('show')
        .t('chat')
        .up()
        .c('status')
        .t('Happily echoing your <message/> stanzas');
    self.connection.send(elem);

    callback();
  }

  function onStanza(stanza) {
    if (stanza.attrs.type === 'groupchat') {
      // Get the room name
      var fromParts = stanza.attrs.from.split('/');
      var room = fromParts[0];
      var nick = fromParts[1];

      // Check if the groupchat message we received was from ourselves.
      if (stanza.attrs.from === room + "/" + self.nick) {
        console.dir("Ignoring message from myself");
        return;
      }

      // Dispatch message to appropriate room.
      if (self.rooms[room]) {
        self.rooms[room]['onMessage'] && self.rooms[room].onMessage(stanza);
      }
    }
  }

  self.connection.on('error', function(e) {
    console.error(e);
  });
}

// Connect to XMPP.
Client.prototype.join = function (name) {
  var room = this.rooms[name] = new Room (this, name);
  room.join();
  return room;
}

function Room (client, name) {
  this.client = client;
  this.name = name;
}

// Join the channel.
Room.prototype.join = function $join$ () {
  var elem = (new xmpp.Element('presence', { from: this.client.jid, to: this.name + '/' + this.client.nick }));
  elem.c('x', { xmlns:'http://jabber.org/protocol/muc' }).c('history', { 'maxchars': 0 });
  this.client.connection.send(elem);
}

Room.prototype.say = function $say$ (what) {
  // Send a message.
  var elem = (new xmpp.Element('message', { from: this.client.botJID, to: this.name, type: 'groupchat' })
               .c('body')
               .t(what));
  this.client.connection.send(elem);
}

function dump (obj) {
  console.log(sys.inspect(obj, true, 10, true));
}

main();

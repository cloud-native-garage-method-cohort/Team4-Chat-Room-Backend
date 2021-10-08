const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const proto = require('./chatproto/proto');
const PORT = 3000;

class Chatroom {
    constructor(port) {
        this._port = port;
        this._clients = new Map(); // Map of client sockets to client name (String)

        let app = express();
        app.get('/', (req, res) => res.send("Chatroom Backend")); // Dummy index page on HTTP

        let server = http.createServer(app);
        this._server = server;
        this._websock = new WebSocket.Server({ server });
    }

    start() {
        this._server.listen(this._port, () => {
            console.log(`Server started at port ${this._port}`)
        });
        this._websock.on('connection', (client) => {
            this._handleConnection(client);
        });
    }

    _terminate(client, status) {
        proto.sendMessage(client, new proto.ReplyMessage(status));
        this._clients.delete(client);
        client.close();
    }

    _getClientByName(searchName) {
        for(let [client, name] of this._clients) {
            if(name == searchName) return client;
        }
        return null;
    }

    _connectClient(client, connectReq) {
        if (this._clients.get(client)) {
            console.log(`Client ${connectReq.name} already connected.`);
            return;
        }
        
        if(this._getClientByName(connectReq.name)) {
            console.log(`Client ${client} tried to use an already taken name (${connectReq.name})`);
            proto.sendMessage(client, new proto.ReplyMessage(proto.Status.NAME_TAKEN_ERR));
            return;
        }

        this._clients.set(client, connectReq.name);
        
        const ack = new proto.ReplyMessage(proto.Status.CONNECT_OK);
        proto.sendMessage(client, ack);
        console.log(`${connectReq.name} connected!`);

        const updatedClients = new proto.ClientListMessage(Array.from(this._clients.values()));
        this._broadcast(updatedClients);

    }

    _broadcast(message, excluded=null) {
        console.log(`Broadcasting ${message.type}...`)
        this._clients.forEach((name, receiver, map) => {
            if (receiver !== excluded && receiver.readyState == WebSocket.OPEN) {
                proto.sendMessage(receiver, message);
            }
        });
    }

    _handleMessage(client, message) {
        let clientName = this._clients.get(client);

        if (!clientName) {
            console.log(`Client ${client} tried to send a message but isn't logged in!`);
            this._terminate(client, proto.Status.AUTH_NEEDED);
            return;
        }

        if (clientName !== message.name) {
            console.log(`Client ${clientName} tried to send a message as ${message.name}`);
            this._terminate(client, proto.Status.GENERIC_ERR);
            return;
        }

        console.log(`Received message from ${clientName}`);
        this._broadcast(message, client);
    }

    _handleConnection(client) {
        client.on('message', (data) => {
            try {
                let message = proto.parseMessage(data);

                switch (message.type) {
                    case proto.MessageType.CONNECTION_REQUEST:
                        this._connectClient(client, message);
                        break;
                    case proto.MessageType.MESSAGE_DATA:
                        this._handleMessage(client, message);
                        break;
                    default:
                        console.log(`Invalid message type ${message.type} from client`);
                        // Be nice and send an error message
                        this._terminate(client, proto.Status.GENERIC_ERR);
                        break;
                }
            } catch (e) {
                console.log("Error handling message:");
                console.log(e);
                this._terminate(client, proto.Status.GENERIC_ERR);
            }
        });
    }
}

const chatroom = new Chatroom(PORT);
chatroom.start();

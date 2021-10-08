const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const proto = require('./proto');
const PORT = 3000;

class Chatroom {
    constructor(port) {
        this._port = port;
        this._clients = new Map(); // Map of client sockets to client name (String)
        let server = http.createServer(express);
        this._server = server;
        this._websock = new WebSocket.Server({ server });
    }

    start() {
        this._server.listen(this._port, () => console.log(`Server started at port ${this._port}`));
        this._websock.on('connection', (client) => this._handleConnection(client));
    }

    _terminate(client, status) {
        proto.sendMessage(client, new proto.ReplyMessage(status));
        this._clients.delete(client);
        client.close();
    }

    _connectClient(client, connectReq) {
        if (this._clients.get(client)) {
            console.log(`Client ${connectReq.name} already connected.`);
            return;
        }

        for (let name of this._clients.values()) {
            if (name === connectReq.name) {
                console.log(`Client ${client} tried to use an already taken name (${connectReq.name})`);
                proto.sendMessage(client, new proto.ReplyMessage(proto.Status.NAME_FOUND));
                return;
            }
        }

        this._clients.set(client, connectReq.name);
        proto.sendMessage(client, new proto.ReplyMessage(proto.Status.OK));

        console.log(`${connectReq.name} connected!`);
    }

    _broadcast(client, message) {
        this._clients.forEach((name, receiver, map) => {
            if (client !== receiver && receiver.readyState == WebSocket.OPEN) {
                proto.sendMessage(receiver, message);
            }
        });
    }

    _handleMessage(client, message) {
        let clientName = this._clients.get(client);

        if (!clientName) {
            console.log(`Client ${client} tried to send a message but isn't logged in!`);
            this._terminate(client, proto.Status.ERR);
            return;
        }

        if (clientName !== message.name) {
            console.log(`Client ${clientName} tried to send a message as ${message.name}`);
            this._terminate(client, proto.Status.ERR);
            return;
        }

        console.log(`Received message from ${clientName} broadcasting...`);
        this._broadcast(client, message);
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
                        this._terminate(client, proto.Status.ERR);
                        break;
                }
            } catch (e) {
                console.log("Error handling message:");
                console.log(e);
                this._terminate(client, proto.Status.ERR);
            }
        });
    }
}

const chatroom = new Chatroom(PORT);
chatroom.start();

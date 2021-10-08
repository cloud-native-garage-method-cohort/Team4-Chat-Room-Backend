const MessageType = {
    CONNECTION_REQUEST : "REQ",
    CONNECTION_REPLY   : "RPL",
    MESSAGE_DATA       : "MSG",
    CLIENT_LIST       : "LST",
};

// TODO: review serialization, maybe can be done automatically
class ProtoMessage {
    constructor(type) {
        this._type = type;
    }

    get type() {
        return this._type;
    }

    serialize() {
        return { type : this._type };
    }
}

class ConnectMessage extends ProtoMessage {
    constructor(name) {
        super(MessageType.CONNECTION_REQUEST)
        this._name = name;
    }

    get name() {
        return this._name;
    }

    serialize() {
        let res = super.serialize();
        res.name = this._name;
        return JSON.stringify(res);
    }
}

const Status = {
    CONNECT_OK     : "Succesfully connected",
    CONNECT_ERR    : "Error connection to the chatroom",
    GENERIC_ERR    : "Error comunicating with the chatroom",
    AUTH_NEEDED    : "Authorization needed",
    NAME_TAKEN_ERR : "Username already taken",
};

class ReplyMessage extends ProtoMessage {
    constructor(status) {
        super(MessageType.CONNECTION_REPLY);
        this._status = status;
    }

    get status() {
        return this._status;
    }

    serialize() {
        let res = super.serialize();
        res.status = this._status;
        return JSON.stringify(res);
    }
}

class ChatMessage extends ProtoMessage {
    constructor(name, message) {
        super(MessageType.MESSAGE_DATA);
        this._name = name;
        this._message = message;
    }

    get name() {
        return this._name;
    }

    get message() {
        return this._message;
    }

    serialize() {
        let res = super.serialize();
        res.name = this._name;
        res.message = this._message;
        return JSON.stringify(res);
    }
}

class ClientListMessage extends ProtoMessage {
    constructor(clients) {
        super(MessageType.CLIENT_LIST);
        this._clients = clients;
    }

    get clients() {
        return this._clients;
    }

    serialize() {
        let res = super.serialize();
        res.clients = this._clients;
        return JSON.stringify(res);
    }
}

function parseMessage(message) {
    var messageJson = JSON.parse(message);

    let type = messageJson.type;
    switch(type) {
    case MessageType.CONNECTION_REQUEST:
        return new ConnectMessage(messageJson.name);
    case MessageType.CONNECTION_REPLY:
        return new ReplyMessage(messageJson.status);
    case MessageType.MESSAGE_DATA:
        return new ChatMessage(messageJson.name, messageJson.message);
    case MessageType.CLIENT_LIST:
        return new ClientListMessage(messageJson.clients);
    }

    throw TypeError("Unknown message type");
}

function sendMessage(client, message) {
    client.send(message.serialize());
}

module.exports.MessageType = MessageType;
module.exports.Status = Status;

module.exports.ConnectMessage = ConnectMessage;
module.exports.ReplyMessage = ReplyMessage;
module.exports.ChatMessage = ChatMessage;
module.exports.ClientListMessage = ClientListMessage;

module.exports.parseMessage = parseMessage;
module.exports.sendMessage = sendMessage;

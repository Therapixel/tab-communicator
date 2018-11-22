
class TabCommunicator {
    constructor() {
        this.messageCallbacks = {};
        this.responseCallbacks = {};
        this.responseTimeouts = {};

        // constants
        this.storageMessagePrefix = 'tpxStorageMessage';
        this.storageMessageResponsePrefix = 'tpxStorageMessageResponse';
        this.storageMessageRegex = new RegExp(`^${this.storageMessagePrefix}:(.*)`);
        this.storageMessageResponseRegex = new RegExp(`^${this.storageMessageResponsePrefix}:(.*)`);

        window.addEventListener('storage', (ev) => {
            const message = this._parseMessageEvent(ev);
            let callback;
            if (message != null) {
                if (message.isResponse) {
                    callback = this.responseCallbacks[message.name];
                    if (respCb != null) {
                        clearTimeout(this.responseTimeouts[message.name]);
                        delete this.responseCallbacks[message.name];
                    }
                } else {
                    callback = this.messageCallbacks[message.name];
                }
            }

            if (callback != null) {
                callback(message);
            }
        });
    }

    on(name, listener) {
        this.messageCallbacks[name] = (message) => {
            listener(...message.args, message.ack);
        };
    }

    emitWithTimeout(name, timeout, ...args) {
        return new Promise((resolve, reject) => {
            this._doEmitMessage(name, false, ...args);

            this.responseCallbacks[name] = resolve;
            if (timeout > 0) {
                const handle = setTimeout(() => {
                    reject();
                    delete this.responseCallbacks[name];
                }, timeout);
                this.responseTimeouts[name] = handle;
            }
        });
    }

    emit(name, ...args) {
        return this._doEmitMessage(name, false, ...args);
    }

    _doEmitMessage(storageMessageResponsePrefix, storageMessagePrefix, name, isResponse, ...args) {
        const type = typeof args;
        if (type === 'function') {
            return;
        }

        args = args.map(value => JSON.stringify(value));
        const prefix = isResponse ? storageMessageResponsePrefix : storageMessagePrefix;
        window.localStorage.setItem(`${prefix}:${name}`, JSON.stringify({
            type: type,
            values: args,
        }));
        window.localStorage.removeItem(`${prefix}:${name}`);
    }

    _parseMessageEvent(ev) {
        // key deleted, don't trigger a message
        if (ev.newValue == null) {
            return;
        }

        // find message name
        let matches = ev.key.match(this.storageMessageResponseRegex);
        let isResponse = true;
        if (matches == null) {
            matches = ev.key.match(this.storageMessageRegex);
            isResponse = false;
            if (matches == null) {
                return;
            }
        }

        const messageName = matches[1];
        if (!messageName) {
            return;
        }

        const data = JSON.parse(ev.newValue);
        const args = data.values.map(arg => JSON.parse(arg));

        // eslint-disable-next-line valid-typeof
        if (typeof args !== data.type) {
            tpxUtils.logError('message data type mismatch');
            return;
        }

        let responseFunc;
        if (!isResponse) {
            responseFunc = (...rspArgs) => {
                this._doEmitMessage(messageName, true, rspArgs);
            };
        }

        return {
            name: messageName,
            args: args,
            isResponse: isResponse,
            ack: responseFunc,
        };
    }

    cleanMessages() {
        const cleanUpList = [];
        for (let i = 0; ; ++i) {
            const key = window.localStorage.key(i);
            if (key == null) {
                break;
            }

            const matches = key.match(this.storageMessageRegex);
            if (matches != null) {
                cleanUpList.push(key);
            }
        }
        cleanUpList.forEach(key => window.localStorage.removeItem(key));
    }
}

let instance;
export default function() {
    if (instance == null) {
        instance = new TabCommunicator();
    }
    return instance;
};

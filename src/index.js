const EventEmitter = require('event-emitter');

class TabCommunicator {
    constructor() {
        this.messageEvents = new EventEmitter();
        this.responseEvents = new EventEmitter();
        this.responseTimeoutEvents = new EventEmitter();

        // constants
        this.storageMessagePrefix = 'tpxStorageMessage';
        this.storageMessageResponsePrefix = 'tpxStorageMessageResponse';
        this.storageMessageRegex = new RegExp(`^${this.storageMessagePrefix}:(.*)`);
        this.storageMessageResponseRegex = new RegExp(`^${this.storageMessageResponsePrefix}:(.*)`);

        window.addEventListener('storage', this._onStorageEvent.bind(this));
    }

    _onStorageEvent(ev) {
        const message = this._parseMessageEvent(ev);
        if (message != null) {
            if (message.isResponse) {
                this.responseEvents.emit(message.name, ...message.args);
            } else {
                this.messageEvents.emit(message.name, ...message.args, message.ack);
            }
        }
    }

    on(name, listener) {
        this.messageEvents.on(name, listener);
    }

    once(name, listener) {
        this.messageEvents.once(name, listener);
    }

    off(name, listener) {
        this.messageEvents.off(name, listener);
    }

    emitWithTimeout(name, timeout, ...args) {
        if (timeout < 0) timeout = 0;

        return new Promise((resolve, reject) => {
            let solved = false;
            this.responseEvents.once(name, (_) => {
                if (!solved) {
                    solved = true;
                    resolve(_);
                }
            });
            this.responseTimeoutEvents.once(name, (_) => {
                if (!solved) {
                    solved = true;
                    reject(_);
                }
            });

            setTimeout(() => {
                this.responseTimeoutEvents.emit(name);
            }, timeout);

            this._doEmitMessage(name, false, ...args);
        });
    }

    emit(name, ...args) {
        return this._doEmitMessage(name, false, ...args);
    }

    _doEmitMessage(name, isResponse, ...args) {
        const type = typeof args;
        if (type === 'function') {
            return;
        }

        args = args.map(value => JSON.stringify(value));
        const prefix = isResponse ? this.storageMessageResponsePrefix : this.storageMessagePrefix;
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
module.exports = function() {
    if (instance == null) {
        instance = new TabCommunicator();
    }
    return instance;
};

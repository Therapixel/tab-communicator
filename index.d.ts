// Type definitions for tab-communicator 1.5
// Project: https://github.com/Therapixel/tab-communicator#readme
// Definitions by: Robin Goupil <https://github.com/rgoupil>

type AckFunction = (...args: any[]) => void;
// uncomment when TS support this
// type EventListener = (...args: any[], ack?: AckFunction) => void;
type EventListener = (...args: any[]) => void;
type EmitterMethod = (type: string, listener: EventListener) => void;

declare interface TabCommunicator {
    /**
     * Emit a message
     */
    emit(type: string, ...args: any[]): void;

    /**
     * Emit a message with a timeout on the ack
     */
    emitWithTimeout(type: string, timeout: number, ...args: any[]): Promise<any>;

    /**
     * Remove a registered event listener
     */
    off: EmitterMethod;

    /**
     * Register an event listener
     */
    on: EmitterMethod;

    /**
     * Register an event listener that will only be triggered once
     */
    once: EmitterMethod;

    /**
     * Clean all messages left - useful to cleanup after potential crashed communicator
     */
    cleanMessages: () => void;
}

declare function TabCommunicator(): TabCommunicator;

export = TabCommunicator;

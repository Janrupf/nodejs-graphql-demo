import {EventEmitter} from "events"

export class InteractiveConsole {
    private currentlyActive = false
    private wasPaused = false
    private lastLine: string | null = null
    private buffer = ""
    private multiline = false
    private resolver: ((data: string) => void) | null = null
    private rejecter: ((err: Error) => void) | null = null
    private reading = false

    public constructor() {
        this.onInput = this.onInput.bind(this)
    }

    public activate() {
        if(this.currentlyActive) {
            return
        }
        this.wasPaused = process.stdin.isPaused()
        process.stdin.pause()
        this.currentlyActive = true
        process.stdin.on("data", this.onInput)
    }

    public disable() {
        if(!this.currentlyActive) {
            return
        }
        if(process.stdin.off) {
            process.stdin.off("data", this.onInput)
        }
        if(this.wasPaused && !process.stdin.isPaused()) {
            process.stdin.pause()
        } else if(!this.wasPaused && process.stdin.isPaused()) {
            process.stdin.resume()
        }
        this.currentlyActive = false
    }

    public isActive() {
        return this.currentlyActive
    }

    public async readTextfield(): Promise<string> {
        this.reading = true
        process.stdout.write("> ")
        process.stdin.resume()
        this.multiline = true
        return new Promise<string>((resolve, reject) => {
            this.resolver = (data: string) => {
                this.reading = false
                process.stdin.pause()
                resolve(data)
            }
            this.rejecter = reject
        })
    }

    public async readSingleLine(): Promise<string> {
        this.reading = true
        process.stdout.write("> ")
        process.stdin.resume()
        this.multiline = false
        return new Promise<string>((resolve, reject) => {
            this.resolver = (data: string) => {
                this.reading = false
                process.stdin.pause()
                resolve(data)
            }
            this.rejecter = reject
        })
    }

    private onInput(input: string | Buffer) {
        if(!this.currentlyActive) {
            return
        }

        if(input instanceof Buffer) {
            input = input.toString()
        }

        if(input.endsWith("\n")) {
            input = input.substr(0, input.length - 2)
        }

        if(!this.multiline) {
            if(this.resolver) {
                this.resolver(input)
            }
            this.buffer = ""
            return
        }

        if(this.lastLine === "" && input.length === 0) {
            if(this.resolver) {
                this.resolver(this.buffer)
            }
            this.buffer = ""
            return
        }

        if(input !== "") {
            this.buffer += input + "\n"
        }
        this.lastLine = input
        process.stdout.write("> ")
    }

    public isReading() {
        return this.reading
    }

    public abortReading(err?: Error) {
        if(this.reading && this.rejecter) {
            this.rejecter(err || new Error("Reading aborted by user"))
        }
    }
}
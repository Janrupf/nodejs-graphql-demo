import {GraphQLServer} from "./server/server"
import {GraphQLClient} from "./client/client"
import {InteractiveConsole} from "./client/console";

const Colors = require("colors")
const server = new GraphQLServer()
const client = new GraphQLClient()
const interactiveConsole = new InteractiveConsole()

Colors.setTheme({
    info: "green",
    warn: "yellow",
    error: "red"
})

const origConsoleInfo = console.info
console.info = (message?: any, ...params: any[]) => {
    message = Colors.info("[INFO] ") + message
    const realParams = (params.length < 1) ? "" : params
    origConsoleInfo(message, realParams)
}

const origConsoleWarn = console.warn
console.warn = (message?: any, ...params: any[]) => {
    message = Colors.warn("[WARNING] ") + message
    const realParams = (params.length < 1) ? "" : params
    origConsoleWarn(message, realParams)
}

const origConsoleError = console.error
console.error = (message?: any, ...params: any[]) => {
    message = Colors.error("[ERROR] ") + message
    const realParams = (params.length < 1) ? "" : params
    origConsoleError(message, realParams)
}

server.start().then(() => {
    console.info("Server started")
    if(process.stdin.isTTY) {
        if(process.stdin.readable) {
            console.info("Entering interactive mode")
            enterInteractiveMode()
        } else {
            console.info("Entering interactive mode as soon as stdin is readable")
            process.stdin.on("readable", enterInteractiveMode)
        }
    } else {
        console.warn("Not entering interactive mode as the stdin is not a console")
    }
})

process.once("SIGINT", sigintHandler)
function sigintHandler() {
    if(interactiveConsole.isReading()) {
        interactiveConsole.abortReading(new Error("Reading aborted by ^C"))
        process.once("SIGINT", sigintHandler)
        return
    }

    if(interactiveConsole.isActive()) {
        console.info("Disabling interactive console")
        interactiveConsole.disable()
    }
    console.info("Stopping server")
    server.close().then(() => {
        console.info("Server stopped")
        process.exit(0)
    })
}

async function enterInteractiveMode() {
    interactiveConsole.activate()
    while(await askAction()) {
        console.info("Enter GraphQL request, tripple empty line to send.")
        let request: string
        try {
            request = await interactiveConsole.readTextfield()
        } catch(e) {
            break
        }
        try {
            const response = await client.query(request)
            console.info("Server responded with:")
            console.log(JSON.stringify(response, null, 4))
        } catch(e) {
            if(e instanceof Error) {
                e = e.message
            }
            console.error("Request failed:")
            console.error(e)
        }
    }
    process.emit("SIGINT", "SIGINT")
}

async function askAction() {
    while(true) {
        console.info("Stop server [s(stop)] or enter request [r(equest)]")
        let input
        try {
            input = await interactiveConsole.readSingleLine()
        } catch(e) {
            return false
        }
        switch(input.toLowerCase()) {
            case "s":
            case "stop":
                return false
            case "r":
            case "request":
                return true
            default:
                console.warn(`Invalid input "${input}"`)
        }
    }
}
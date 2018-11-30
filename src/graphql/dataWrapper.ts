import * as FS from "fs"

const filePath = FS.realpathSync("./data.js")

export function getGraphQlTestStruct() {
    return require(filePath)
}

function reloader() {
    FS.watchFile(filePath, () => {
        const entry = require.resolve(filePath)
        delete require.cache[entry]
    })
}

reloader()
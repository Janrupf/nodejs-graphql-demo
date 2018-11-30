import * as HTTP from "http"

export class GraphQLClient {
    public async query(query: string): Promise<object> {
        return new Promise((resolve, reject) => {
            let responseData: string = ""
            const req = HTTP.request({
                host: '127.0.0.1',
                port: 8080,
                method: 'POST',
                headers: {
                    "Content-Type": "application/graphql"
                }
            }, (res: HTTP.IncomingMessage) => {
                res.resume()
                res.on("end", () => {
                    if(res.statusCode !== undefined && res.statusCode >= 400) {
                        return reject(new Error(`Server responded with`
                            + ` ${res.statusMessage || res.statusCode}`))
                    }
                    resolve(JSON.parse(responseData))
                }).on("error", (err) => {
                    reject(err)
                }).on("data", (data) => {
                    if(data instanceof String || typeof(data) === "string") {
                        responseData += data
                    } else {
                        responseData += data.toString()
                    }
                })
            }).on("error", (err) => {
                reject(err)
            })
            req.write(query)
            req.end()
        })
    }
}
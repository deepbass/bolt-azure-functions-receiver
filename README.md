# Custom Azure Functions Receiver for use with the Slack Bolt framework

This package makes it easy to use the Slack Bolt framework on Node.js Azure Functions. Use the following code block:

    const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<any> {
        const receiver = new AzureFunctionsReceiver(process.env["SLACK_SIGNING_SECRET"], context.log);
        const slackApp = new App({
            token: process.env["SLACK_BOT_TOKEN"],
            signingSecret: process.env["SLACK_SIGNING_SECRET"],
            receiver: receiver
        })

        slackApp.message(':wave:', async ({ message, say }) => {
            await say(`Hello, <@${message.user}>`);
        });
        const body = await receiver.requestHandler(req)
        console.log(body)
        return { status: 200, body: body }
    };

    export default httpTrigger;
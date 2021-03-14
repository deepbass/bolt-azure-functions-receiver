# Custom Azure Functions Receiver for use with the Slack Bolt framework

This package makes it easy to use the Slack Bolt framework on Node.js Azure Functions. Use the following code block in Typescript Azure Functions:

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

Or you can use a Javascript Azure Function like this:

    const { AzureFunctionsReceiver } = require("bolt-azure-functions-receiver")
    const { App } = require( "@slack/bolt")

    module.exports = async function (context, req) {
    const receiver = new AzureFunctionsReceiver(
        process.env["SLACK_SIGNING_SECRET"],
        context.log
    );
    const slackApp = new App({
        token: process.env["SLACK_BOT_TOKEN"],
        signingSecret: process.env["SLACK_SIGNING_SECRET"],
        receiver: receiver,
    });

    slackApp.event("app_home_opened", async ({ event, client, context }) => {
        try {
        /* view.publish is the method that your app uses to push a view to the Home tab */
        const result = await client.views.publish({
            /* the user that opened your app's app home */
            user_id: event.user,

            /* the view object that appears in the app home*/
            view: {
            type: "home",
            callback_id: "home_view",

            /* body of the view */
            blocks: [
                {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "Hi from Bolt running on Azure Functions",
                },
                }
            ],
            },
        });
        } catch (error) {
        context.error(error);
        }
    });

    const body = await receiver.requestHandler(req);
    context.log(body);
    return { status: 200, body: body };
    };
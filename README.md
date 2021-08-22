# Overview

## Project Description

ChalmersBot is a chatbot that helps you find local services in Toronto like free meals offered at drop-ins or shelters based on your specific real-time needs, location, and situation. The bot also allows you to share valuable tips among other members and bookmark your personalized results for future reference on-the-go. You can find more information about Amplelabs at amplelabs.co.

## Demo

- Go to https://chalmers.amplelabs.co
- Enable GPS location from your browser, or specify your location when the bot is asking.
- Currently only one skill is available and is only available in Toronto, ON Canada.
- You can always type "help" to see what bot can do.

## Prerequisite

Chalmers bot is developed with `Node.js`, and `nvm` [here](https://github.com/nvm-sh/nvm) is recommanded to manage `Node.js` versions.

Beside the software in the repo, the following external dependences are required for Chalmers to funcion properly.
- AWS account: Chalmers is using Lex for it natural language processing.
- Google Cloud Platform (GCP): Google map service is required for geo-locationing (Google Maps, and Google Maps Directions API)
- twillo: for user feedback via text messaging (https://www.twilio.com)
- MongoDB: Chalmers is using mongoDB cloud service (MongoDB Atlas https://www.mongodb.com/cloud/atlas)
- Serverless framework: for handling AWS lambda function provisioning and deployment

All the services list above have free-tier accounts that you can try.

## Setup

```bash
$ npm install
$ npm install -g serverless # install serverless tooling in global scope (https://www.serverless.com/framework/docs/)
$ cp .env.example .env # fill in the require information
```
- Recommended: Setup AWS named profiles: https://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html
- Configure serverless for AWS: https://serverless.com/framework/docs/providers/aws/guide/credentials/

## AWS Environment

### Lex chat engine and Congito user pool

This repo provides a Cloudformation template in `cloudformation/cfn-aws-chalmers.yaml` that you can use to setup resources required for Chalmers using `aws cli` [see here](https://aws.amazon.com/cli/). Please check official AWS [documents](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/index.html) for more information.

```bash
$ aws --region=us-east-1 cloudformation create-stack --stack-name chalmers-bot-stack --template-body file://./cloudformation/cfn-aws-chalmers.yaml --capabilities CAPABILITY_IAM
```

This will create required AWS resources, including a Lex chatbot `WebUIOrderFlowers` and a `Cognito Pool Id` (required for the UI) in the `us-east-1` region.  

NOTE: in the cloudformation template, there are two instnaces of `Timestamp` parameters that might need to change if cloudfomration complains. They are in unix 10 digits timestamp format.

### MongoDB setup
This project includes a `MongoDB` database dump for services used in Chamlers, and you can use it for testing in your setup. You can skip the following steps if you are familar with setting up a `MongoDB` environment.

1. Setup an account at [MongoDB](https://cloud.mongodb.com)
2. Install [Mongodb Database Tool](https://docs.mongodb.com/database-tools/)
3. Restore database,
```
$ mongorestore --uri mongodb+srv://<user>:<password>@cluster0.0dpqf.mongodb.net ./database/services.bson
```
where `cluster0.0dpqf.mongodb.net` is from your account. This will be used in the `Lambda` in the next section.
4. Verfiy the database restore:
```
$ mongoexport --uri mongodb+srv://<user>:<password>@cluster0.0dpqf.mongodb.net/Downloads --collection services --type json --out ./out.json
```
This will download the database entries (or documents) in `json` format, for your examination.

### Lambda for utterance handling

The Chalmers chatbot uses `AWS Lex` for natural language processing, and the handling of the user correspondence is programmed in one of the `AWS Lambda`s.

To deploy lambdas to your AWS account:
1. Create `.env` with `$cp .env.example .env`
2. Setup / export environment variables. e.g. for `bash` shell:
```  
export DEPLOYMENT_BUCKET=<your s3 deployment bucket>
export GOOGLE_MAPS_DIRECTIONS_KEY=<your google map direction key>
export GOOGLE_MAPS_KEY=<your google map key>
export GOOGLE_API_URL=https://maps.googleapis.com/maps/api/directions/json
export MONGO_URI=<your MongoDB uri> # e.g. mongodb+srv://<user>:<password>@cluster0.0dpqf.mongodb.net/Downloads
```
  - NOTE: you will need a AWS `S3` bucket for deployment. See official aws document for instruction.
3. Register an account with `https://app.serverless.com/`. Create an `app` as per instruction from `serverless.com`
4. Install the `serverless.com` tools e.g. `$npm i -g serverless`
5. Follow [this instruction](https://www.serverless.com/framework/docs/getting-started/) to setup your app. (you can remove the folder it creates)
  - NOTE: change the `org` and `app` parameter in `deploy.sh` to match your setup in serverless.
6. Execute the following commands:
```
$ npm i && ./deploy.sh
```
7. You can check the lambdas you deployed in your AWS console.


## Deploying Chalmers' chat engine

Chalmers' chat bot configuration is in the `./data/chalmers-export.json`, which can be imported to AWS Lex. There are a few changes required before importing it.

1. open `./data/chalmers-export.json` with your editor
2. replace `<aws account number>` and `<env>` with your AWS account setting e.g. `83xxxxxxxx219` and `dev`
3. save

These changes are related to the lambdas deployed in the previous steps, and again you can confirm with your AWS lambda console. e.g.  `arn:aws:lambda:us-east-1:<aws account number>:function:chatbot-find-meals-dev-lex-fulfillment` should be the same as shown in your `arn` of the find-meal function just deployed. 

From this point, you can build your chat engine based on `chalmers-export.json`, by modifying the Lex bot deployed by Cloudformation above (i.e. `WebUiOrderFlowers`) in the AWS Lex console, or just import the modified json (the import button should be easy to find in the Lex console -- note that you need to zip it first i.e. chalmers-export.zip).

NOTE: When importing the zip file to Lex, likely you will get an error similar to this:
```
Lex can't access the Lambda function arn:aws:lambda:us-east-1:<account number>:function:chatbot-find-crisis-<env>-fulfilment in the context of intent arn:aws:lex:us-east-1:<>:intent:CrisisHelpHelper:$LATEST. Check the resource based policy on the function and try your request again.
```

This can be fixed with with AWS cli:
```
$ aws lambda add-permission --function-name arn:aws:lambda:us-east-1:<aws account number>:function:chatbot-find-meals-dev-lex-validations  --statement-id chatbot-fulfillment --action "lambda:InvokeFunction" --principal "lex.amazonaws.com" --region us-east-1
```
This is due to the severless yaml template missing resource policy document at the moment. 

NOTE: `feedback-by-phone` feature is not release yet at the moment.

Once you done buidling and testing (can be done inside the AWS Lex console), you have to build and publish the bot (see official AWS doc for more info). Note for the bot name, version, and alias, they will be need for the front end.

Either way, you have to modify the IAM role created by Cloudformation to allow authenticated and unauthenticated user to invoke the lambdas (from your web app e.g. web front end).

For example, the unauthenticated user IAM role from my deployment is `chalmers-bot-stack-CognitoIden-CognitoUnauthRoleV1-G8LBxxxx03QJ`, and can be find under the role section of the AWS IAM console. It has the following entry:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "lex:PostText",
                "lex:PostContent",
                "lex:DeleteSession",
                "lex:PutSession"
            ],
            "Resource": [
                "arn:aws:lex:us-east-1:<aws account number>:bot:WebUiOrderFlowers:*",
                "arn:aws:lex:us-east-1:<aws account number>:bot:<!YOUR BOT>:*" <--- EDIT
            ],
            "Effect": "Allow"
        }
    ]
}
```

You will need to add your Lex chat bot info indicated above. You can also give this role to all your Lex bot, which usually is not a good idea.
THere are two roles you need to modify the same way, and you can just do it with the AWS IAM console. The `<YOUR BOT>` name can be find in the AWS Lex console. The `arn` for these roles will be need by the front end also, otherwise it won't have the permission to call any Lex functions.



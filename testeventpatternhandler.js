'use strict';

module.exports.handler = async event => {
    //use aws profile: [serverless-admin]
    var AWS = require('aws-sdk');

    var region = process.env.AWS_REGION_ENV;


    var secretName = process.env.RDS_POSTGRES_CONNECTION_AWS_SECRET_NAME;

    //if test in local dev , then set credentials
    var credentials = new AWS.SharedIniFileCredentials({profile: 'serverless-admin'});
    //if in lambda in AWS , use IAM Role for Lambda , the IAM user is serverless-admin at this point
    var iam = new AWS.IAM({apiVersion: '2010-05-08'});

    AWS.config.credentials = credentials;
    AWS.config.region = region;



    var eventBridge = new AWS.EventBridge({apiVersion:'2015-10-07'});


    try{

        //full sample
        var eventParam = {
            "version": "0",
            "id": "6f87d04b-9f74-4f04-a780-7acf4b0a9b38",
            "detail-type": "AWS Console Sign In via CloudTrail",
            "source": "aws.signin",
            "account": "123456789012",
            "time": "2016-01-05T18:21:27Z",
            "region": "us-east-1",
            "resources": [],
            "detail": {
                "eventVersion": "1.02",
                "userIdentity": {
                    "type": "Root",
                    "principalId": "123456789012",
                    "arn": "arn:aws:iam::123456789012:root",
                    "accountId": "123456789012"
                },
                "eventTime": "2016-01-05T18:21:27Z",
                "eventSource": "signin.amazonaws.com",
                "eventName": "ConsoleLogin",
                "awsRegion": "us-east-1",
                "sourceIPAddress": "0.0.0.0",
                "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36",
                "requestParameters": null,
                "responseElements": {
                    "ConsoleLogin": "Failure"
                },
                "additionalEventData": {
                    "LoginTo": "https://console.aws.amazon.com/console/home?state=hashArgs%23&isauthcode=true",
                    "MobileVersion": "No",
                    "MFAUsed": "No"
                },
                "eventID": "324731c0-64b3-4421-b552-dfc3c27df4f6",
                "eventType": "AwsConsoleSignIn"
            }
        }


        var eventPatternParam =  {
            "detail-type": [
                "AWS Console Sign In via CloudTrail"
            ],
            "responseElements" : {
                "ConsoleLogin": ["Failure"]
            }
        };


        var params = { Event: JSON.stringify(eventParam),
                       EventPattern: JSON.stringify(eventPatternParam)};

        //var params = { Event: eventParam,
        //    EventPattern: eventPatternParam};
       
       var testEventPatternResult =   await  eventBridge.testEventPattern(params).promise();

       return {statusCode:200};
    }
    catch (e) {
        console.log(e);

        return {statusCode:400} ;
    }
}
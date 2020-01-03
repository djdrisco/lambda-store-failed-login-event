'use strict';
var AWS = require('aws-sdk');
var _ = require('underscore');

module.exports.handler = async event => {

    console.log("ENVIRONMENT VARIABLES\n" + JSON.stringify(process.env, null, 2));
    console.info("EVENT\n" + JSON.stringify(event, null, 2));
    //use aws profile: [serverless-admin]


    var region = process.env.AWS_REGION_ENV;

    var secretName = process.env.RDS_POSTGRES_CONNECTION_AWS_SECRET_NAME;

    //if test in local dev , then set credentials
    if(process.env.stage !== undefined && process.env.stage==="local_dev"){
        var credentials = new AWS.SharedIniFileCredentials({profile: 'serverless-admin'});
        AWS.config.credentials = credentials;
        AWS.config.region = region;
    }

    //if in lambda in AWS , use IAM Role for Lambda , the IAM user is serverless-admin at this point
    var iam = new AWS.IAM({apiVersion:'2010-05-08'});

    var secretsManager = new AWS.SecretsManager({apiVersion:'2017-10-17'});

    // get UserName from CloudWatch event
    try{

        //var secretValue = await secretsManager.getSecretValue({SecretId: 'automation_db'}).promise();
        var secretValue = await secretsManager.getSecretValue({SecretId: secretName}).promise();

        const pg = require('pg');


        if('SecretString' in secretValue.$response.data) {

            console.info("SecretString IS IN secretValue.$response.data");
            //Convert String to JSON Object

            var jsonSecretValues = JSON.parse(secretValue.$response.data.SecretString);

            console.info("jsonSecretValues.username : " + jsonSecretValues.username);
            console.info("jsonSecretValues.host : " + jsonSecretValues.host);
            console.info("jsonSecretValues.dbname : " + jsonSecretValues.dbname);
            //console.info("jsonSecretValues.password : " + jsonSecretValues.password);
            console.info("jsonSecretValues.port : " + jsonSecretValues.port);

            const pool = new pg.Pool({user:jsonSecretValues.username, host:jsonSecretValues.host,
                database:jsonSecretValues.dbname,password: jsonSecretValues.password, port:jsonSecretValues.port});

         
            var eventTime = "";
            var userName = "";
            var userIdentity ="";
            var userAgent = "";
            var eventSource = "";
            var eventName = "";
            var awsRegion = "";
            var sourceIpAddress="";
            var requestParameters="";
            var responseElements="";
            var resources = "";
            var requestID = "";
            var eventID ="";
            var eventType ="";

            if(process.env.stage !== undefined && process.env.stage==="local_dev"){

                //local testing
                   console.info("local dev environment");
                   eventTime = '    NOW() ';
                   userName = process.env.userName;
                   userIdentity =   '\'{\"type\": \"IAMUser\",  \n' +
                       '  "principalId": "AIDACKCEVSQ6C2EXAMPLE",   \n' +
                       ' "arn": "arn:aws:iam::444455556666:user/JaneDoe",    \n' +
                       '"accountId": "444455556666",   \n'+
                       '"accessKeyId": "AKIAI44QH8DHBEXAMPLE",   \n'+
                       ' "userName": "david"  \n'   +
                       ' }\'';

                   eventSource = '\'IAM\'';
                   eventName = '\'ConsoleLogin\'';
                   userAgent = '\'Desktop\'';
                   awsRegion = '\'us-east-1\'';
                   sourceIpAddress = '\'10.0.0.1\'';
                   requestParameters = '\'null\'';
                   responseElements = '\'{  ' +
                       '\"ConsoleLogin\": \"Failure\" \n' +
                       '}\''  ;
                   resources = '\'null\'';
                   requestID =  '\'null\'';
                   eventID ='\'null\'';
                   eventType = '\'AWSConsoleLogin\'';

            }else if(event.detail!==undefined&&event.time!==undefined&&event.detail.userIdentity!==undefined&&event.detail.userIdentity.userName!==undefined &&
               event.detail.userAgent !== undefined && event.detail.eventSource !== undefined &&
               event.detail.eventName !== undefined && event.detail.awsRegion !== undefined &&
               event.detail.sourceIPAddress !== undefined && event.detail.requestParameters !== undefined &&
               event.detail.responseElements !== undefined && event.resources !== undefined &&
               event.detail.eventID !== undefined && event.id !== undefined){
                     console.info("event.detail.userName DEFINED, userName is: " + event.detail.userIdentity.userName);
                     eventTime = '\'' + event.time + '\'';
                     userName = '\'' + event.detail.userIdentity.userName + '\'';
                     userIdentity = '\'' + JSON.stringify(event.detail.userIdentity) + '\'';
                     userAgent = '\'' + event.detail.userAgent + '\'';
                     eventSource = '\'' + event.detail.eventSource + '\'';
                     eventName = '\'' + event.detail.eventName + '\'';
                     awsRegion = '\'' + event.detail.awsRegion + '\'';
                     sourceIpAddress = '\'' + event.detail.sourceIPAddress + '\'';
                     if(event.detail.requestParameters === null) {
                          console.info("event.detail.requestParameters is null") ;
                          requestParameters =   '\'null\'';
                     }
                     else{
                         console.info("event.detail.requestParameters is NOT null") ;
                        requestParameters = '\'' + JSON.stringify(event.detail.requestParameters) + '\'';
                     }
                     
                     responseElements = '\'' + JSON.stringify(event.detail.responseElements) + '\'';

                     if(_.isEmpty(event.resources)){
                         console.info('event.resources is empty');
                         resources =   '\'null\'';
                     }
                     else{
                         console.info('event.resources is NOT empty');
                         resources = JSON.stringify(event.resources);
                     }

                     eventID = '\'' + event.detail.eventID + '\'';
                     requestID = '\'' + event.id + '\'';
                     eventType = '\'' + event.detail.eventType + '\'';
             }

            if(userIdentity!==""){


                var queryInsert =
                        'INSERT INTO public.cloudtrailevents(\n' +
                        'event_version, user_identity, event_time, event_source, event_name, aws_region,   \n' +
                        'source_ip_address, useragent, request_parameters, response_elements, \n' +
                        'resources, request_id, shared_event_id, event_id, event_type, recipient_account_id)\n' +
                        'VALUES (\'1.05\', \n' +
                        userIdentity +
                        ',' +
                        eventTime + ', ' +  eventSource + ',' + eventName + ',' + awsRegion +  ',' + sourceIpAddress + ',\n' +
                        userAgent + ',' +  requestParameters + ','  +   responseElements + ',' +
                        resources + ',' + requestID + ',' + '\'null\',' + eventID + ',' + eventType + ',' + '\'null\')'

                console.info("queryInsert: " + queryInsert);

             
                await pool.query(queryInsert).then(queryResult=>{
                    console.info('query completed successfully ');
                })
                    .catch(err=>{
                        console.info('error: ' + err);
                        return {statusCode: 400};
                    });

                await pool.end();

                return {statusCode: 200};

            }
            else{
                console.info("one of the event or event.detail properties undefined");
                return {statusCode: 400};
            }

        }
        else{
            console.info("SecretString NOT IN secretValue.$response.data");
            return {statusCode: 400};
        }
    }
    catch (e) {
        
        console.info("Exception encountered :\n" + JSON.stringify(e, null, 2));
        console.log(e);

        return {statusCode:400} ;
    }
};

'use strict';
var AWS = require('aws-sdk');

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

         

            var userName = "";

            var userIdentity ="";

            if(process.env.stage !== undefined && process.env.stage==="local_dev"){

                //local testing
                   console.info("local dev environment");
                   userName = process.env.userName;
                   userIdentity =   '\'{\"type\": \"IAMUser\",  \n' +
                       '  "principalId": "AIDACKCEVSQ6C2EXAMPLE",   \n' +
                       ' "arn": "arn:aws:iam::444455556666:user/JaneDoe",    \n' +
                       '"accountId": "444455556666",   \n'+
                       '"accessKeyId": "AKIAI44QH8DHBEXAMPLE",   \n'+
                       ' "userName": "david"  \n'   +
                       ' }\'';

            }else if(event.detail!==undefined&&event.detail.userIdentity!==undefined&&event.detail.userIdentity.userName!==undefined){
                    console.info("event.detail.userName DEFINED, userName is: " + event.detail.userIdentity.userName);
                     userName = event.detail.userIdentity.userName;
                     userIdentity = JSON.stringify(event.detail.userIdentity);
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
                        '    NOW(), \'IAM\', \'ConsoleLogin\', \'us-east-1\', \'10.0.0.0.1\', \'desktop\',    \n' +
                        '\'{  \"userName\": \"JaneDoe\", \n' +
                        ' \"policyName\": \"ReadOnlyAccess-JaneDoe-201407151307\" \n' +
                        '}\',' +
                        '\'{  ' +
                        '\"ConsoleLogin\": \"Failure\" \n' +
                        '}\',' +
                        '\'null\',' + '\'99EXAMPLE-0c68-11e24e\',' + '\'null\',' + '\'cEXAMPLE-127ef-4634-980d-505a4EXAMPLE\',' + '\'ConsoleLogin\',' + '\'null\')'

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
                console.info("event.detail.userName undefined");
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

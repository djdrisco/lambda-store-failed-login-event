require('dotenv').config();
var expect = require('chai').expect;
var myLambda = require('../handler');
var retError, retValue ;



describe('myLambda',function() {
    context('Positive Test Case', function () {


        before('Calling myLambda function', async() => {
            var event = {
                num1: 3,
                num2: 2,
                operand: "+"
            };
            retValue = await myLambda.handler(event);
        });



        it('Check value returned from myLambda', function () {
            expect(retValue.statusCode).to.equal(200);

        });
    });
});
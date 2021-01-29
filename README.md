# zv-express-error-handler
Provides a class for handling various operational errors and provides middlewares and utilities to catch async function errors, unhandled rejection, and uncaught exceptions in a node-express application.

### Basic Usage
In the main script file e.g. `server.js`:
```
const { uncaughtExceptionHandler, unhandledRejectionHandler } = require('zv-express-error-handler');

uncaughtExceptionHandler();


// rest of code here


const server = app.listen(port, () => console.log(`App running on port ${port}...`));

unhandledRejectionHandler(server);
```
Call the `uncaughtExceptionHander` function immediately after all (required) imports. To be able to gracefully exit the (express) server, assign it to a variable and pass as an argument to the `unhandledRejectionHander` function.
<br><br>---<br>
In the *express application* file e.g. `app.js`:
```
const { invalidRoutesHandler, globalErrorHandler } = require('zv-express-error-handler');


// rest of code here


app.all('*', invalidRoutesHandler);
app.use(globalErrorHandler);
```
Example response:
```
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 76
ETag: W/"4c-IDPPkSfOlMTgg23XX0uYkXLRUJM"
Date: Fri, 29 Jan 2021 08:38:15 GMT
Connection: close

{
  "status": "fail",
  "message": "💥 Can't find /api/v1/userss on this server!"
}
```
<br>---<br>
In the *controller* file:
```
const { AppError, asyncCatch } = require('zv-express-error-handler');


// rest of code here


exports.getUser = asyncCatch(async (req, res, next) =>
{
  const user = await User.findById(req.params.id);

  if (!user) return next(new AppError('💥 Invalid ID!', 404));

  res.status(200).json(
  {
    status: 'success',
    data: { user }
  });
});


// rest of code here
```
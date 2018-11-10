# express-mvc-router

`express-mvc-router` is a [node.js](https://nodejs.org/) module to be used with [Express](http://expressjs.com/). It simplifies route management by automatically loading controllers and generating routes based on controller methods.

## Installation

Use Node Package Manager (npm) to download the module and install it in your project:

    npm install express-mvc-router --save


## Basic Usage

In your Express application, simply require the module and call its `load` method passing the Express app as parameter. Example:

```javascript
const express = require('express');
const MVCRouter = require('express-mvc-router');

var app = express();
app.use('/', new AutoRouter().load());

// ...

app.listen(process.env.PORT || 80);
```

The above code will load all controllers located on the default directory `./controllers`, and will parse all its methods and properties to generate routes.

## Controllers

Controller files should export a simple object with functions (called actions) or a ES6 class. Those functions will be used to create the routes. In its simplest form, a controller could has the following structure:

```javascript
// filename: homeController.js
module.exports = {

    index: function() {
        this.res.send('hello index!');
    },

    someAction: function() {
        this.render();
    },

    // ...
}
```

The above controller will handle the paths "/home/index" and "/home/someAction" without the need for any configuration.

The `this` context during the execution of the actions will be the controller itself, which will be injected with the following properties:

 - `this.req`: the request object that was provided by Express
 - `this.res`: the response object that was provided by Express
 - `this.render`: a utility method to simplify view rendering

Routing methods and view rendering will be explained in detail in the next sections.

## Routing

### Implicit routes

Implicit routes can be simply defined by creating a function method in a controller object. The module will take care of creating the route automatically. Every function in the controller (with a few exceptions described later on) will correspond to a route. The generated routes will be used to handle the appropriate HTTP method, with a path that follows the pattern:

    [/controllerName]/actionName[/parameter1/parameter2/parameter3/...]

Segments that are wrapped in square brackets in the pattern above are optional, depending on the route values, described below.

The route will be created by extracting the following information:

 - **HTTP method** *(GET, POST, PUT, PATCH or DELETE)*: if the name of the function in the controller starts with an HTTP method (e.g. `getUser`, `postUser`, `deleteUser`, etc.), then that method will be used to handle that action. If the action has any other name (e.g. `news`, `home`, `about`, etc.), the GET method will be used.

 - **controllerName**: the controller name will be used as the first segment for the generated route URL. If not manually specified, the name of the file will be used, cleaned of the *.js* extension and any *Controller* or *Ctrl* suffix. For example, a controller that is defined in a file called `userController.js`, will have `user` as its controller name. It is also possible to override this by manually specifying the value. To do that, simply create a string property in the controller called `controllerName`, and assign it the appropriate value. Whenever the controller is named "default" (whether by calling the file "defaultController.js" of by specifying the `controllerName: 'default'` property), then the *controllerName* segment of the URL will be omitted.

 - **actionName**: the action name will be used as the second segment for the generated route URL. Its value will be parsed from the name of the function that defines the route, minus the HTTP method name and other special configration characters described in later sections. For example, the methods `user`, getUser`, `postUser`, `deleteUser` will all take the action name `user`.

- **optionalParameter1**, **optionalParameter2**, etc.: if the function that defines the action accepts arguments, then those arguments will be used as additional segments for the route. When a URL is called which will be handled by the current action, the arguments will passed with the value of the parameter read from the URL. For example, a function defined as `search(name)` in a controller called `project`, will handle the path `/project/search/:name`. When a user opens the URL `/project/search/node`, then the function `search` will be executed, passing the value "node" to the argument `name`

**Special actions**: assigning one of the following names to an action will handle a particular path:

 - index
 - get
 - post
 - put
 - patch
 - delete

In all the above cases, the handled path will be just */controllerName*, using the HTTP verb specified in the action name. The action name `index` is the only one that is not the name of an HTTP verb; it handles the GET verb and is useful for default pages in a controller. The rest of the action names are intended for REST APIs.

**Hidden actions**: sometimes a developer might want to define a function which shouldn't be used to generate an implicit route. In order to "hide" a method from the implicit routing system, you can define the function by giving it a name that starts with an underscore "_". For example, if a controller has a method called `_loadFile`, that method will not be used to create any implicit route. The method, however, can still be used in explicit routes, which are described in the next section.

## View rendering
When using a view engine to render the views, the module offers a quick way to render the right view without the need to specify its path. It works in a similar way to how the path for the route is constructed. Example:

```javascript
// fileName: homeController.js
module.exports = {
    someAction: function() {
        this.render({
            // optional data object
        });
    }
};
```

In the above controller, the `this.render` method call will be equivalent to calling `this.res.render('home/someAction', {});`. The first segment of that path ("test") will be inferred from the file name (in the same way as the controller name for the route path URL), while the second segment, as in route paths, will be inferred from the action name. It is possible to manually specify the value of the first segment, by creating a property called `viewBaseName`.

It is also possible to specify the name of the view to render. So by calling `this.render('customView', {});` will render the view with path "/test/customView".

The `this.render` function only allows rendering of views under the same *viewBaseName* path. If you want to render a view under another path, you can normally use the "old" function `this.res.render`.

## Protected routes
**TODO: document this**

## Controller examples

Below is an example of a controller file:

```javascript
// file name: /controllers/homeController.js
module.exports = {

    // implicit GET method.
    // will handle path GET /home
    get: function() {
        this.res.send('hello from home');
    },

    // implicit GET method.
    // will handle path GET /home/something
    getSomething: function() {
        // renders the view with path 'test/something'
        this.render({
            // data to pass to view
        });
    },

    // implicit GET method.
    // will handle path GET /home/somethingElse
    getSomethingElse: function() {
        // renders the view with path 'home/customView'
        this.render('customView', {
            // data to pass to view
        });
    },

    // implicit GET method with function parameters.
    // will handle path GET /home/withParameters/:foo/:bar
    getWithParameters: function(foo, bar) {
        // renders the view with path 'home/customView'
        this.res.json({ foo: foo, bar: bar });
    },

    // implicit POST method.
    // will handle path POST /home
    post: function() {
        this.res.send('hello from home');
    },

    // implicit POST method.
    // will handle path POST /home/something
    postSomething: function() {
        this.res.send('hello from home');
    },

    // hidden method.
    // will not handle any implicit routes. Can be referenced
    // by explicit routes
    _someHiddenMethod: function() {
        this.res.send('hello from home');
    },

    // hidden method.
    // will not handle any implicit routes. Can be referenced
    // by explicit routes
    _someOtherHiddenMethod: function() {
        this.res.send('hello from home');
    },

    // hidden method.
    // will not handle any implicit routes. Can be referenced
    // by explicit routes
    _yetAnotherHiddenMethod: function() {
        this.res.send('hello from home');
    },

};
```

With eES6 class:
```javascript
// file name: /controllers/homeController.js
module.exports = class homeController {
	constructor(){}

    // implicit GET method.
    // will handle path GET /home
	index(){
		this.res.send('home index');
	}

    // implicit GET method.
    // will handle path GET /home/user/:userId
	getUser(userId){
		this.res.json({
			userId: this.req.params.userId
		})
	}
}
```

## Initialisation options:

 - **controllerPath** (string): specifies the file system location (relative to the root path of the Express application) where the controller files are located.
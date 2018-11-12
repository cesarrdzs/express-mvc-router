const path = require('path');
const recursive = require('recursive-readdir');
const router = require('express').Router();

module.exports = class ExpressMVCRouter {
	/**
	 * The main loader class
	 *
	 * @constructor
	 *
	 * @param {object} options Initialisation options (optional)
	 */
	constructor(options) {
		this.router = router;
		this.implicitMethodPattern = /^(get|post|put|patch|delete)/;
		this.explicitMethodPattern = /^\{\s*(GET|POST|PUT|DELETE|PATCH)\s*\}\s*/;

		this.options = Object.assign({
			controllerPath: './controllers'
		}, options || {});
	}

	load() {
		this.loadControllers();
		return this.router;
	}

	loadControllers() {
		let localPath;

		if (module.parent) localPath = path.resolve(path.dirname(module.parent.filename))
		else localPath = __dirname;

		var controllersFullPath = path.resolve(localPath, this.options.controllerPath);

		recursive(controllersFullPath, (err, files) => {
			if (err) throw err;
			files.forEach(file => {
				var relativePath = path.relative(controllersFullPath, file).replace('\\', '/');
				let extension = path.extname(relativePath);
				if (extension === '.js') {
					const controller = require(file);
					if (controller) {
						let controllerData = this.getControllerData(controller, relativePath);
						// that.loadExplicitRoutes(controllerData);
						this.loadImplicitRoutes(controllerData);
					}
				}
			});
		});
	}

	getControllerData(controller, fileName) {
		let controllerName = fileName.replace(/(controller|ctrl)?\.js/i, '');
		let viewBaseName = controllerName;
		return {
			controllerDef: controller,
			controllerName: controllerName,
			viewBaseName: viewBaseName
		}
	}

	loadImplicitRoutes(controllerData) {
		let controller = controllerData.controllerDef;
		if (typeof controller == "object") {
			let allActions = controller;
			let instance = allActions;
			this.setObjectActions(controllerData, instance, allActions);
		} else {
			let allActions = Object.getOwnPropertyNames(controller.prototype)
			.filter(x => x !== 'constructor' && x.charAt(0) !== '_');
			let instance = new controller();
			this.setFunctionActions(controllerData, instance, allActions);
		}
	}

	setObjectActions(controllerData, instance, allActions) {
		for (let actionName in allActions) {
			if (typeof instance[actionName] === 'function' && actionName.charAt(0) !== '_') {
				let pathName = actionName.replace(/^\s+|\s+$/g, '');
				let method = this.getMethod(pathName, false);
				if (pathName === 'index') pathName = '';

				if (this.implicitMethodPattern.test(pathName)) {
					pathName = pathName.replace(this.implicitMethodPattern, '');
					if (pathName)
						pathName = pathName.charAt(0).toLowerCase() + pathName.substr(1);
				}
				var args = this.getParameterNames(instance[actionName]);
				if (args) {
					for (var i = 0; i < args.length; i++) {
						pathName += (pathName ? '/' : '') + ':' + args[i];
					}
				}

				let controllerName = controllerData.controllerName == 'default' ? "" : controllerData.controllerName;
				this.addRoute(method, controllerName + (pathName ? '/' + pathName : ''), controllerData.viewBaseName, actionName, args, instance);
			}
		}
	}

	setFunctionActions(controllerData, instance, allActions) {
		for (let actionName of allActions) {
			if (typeof instance[actionName] === 'function' && actionName.charAt(0) !== '_') {
				let pathName = actionName.replace(/^\s+|\s+$/g, '');
				let method = this.getMethod(pathName, false);
				if (pathName === 'index') pathName = '';

				if (this.implicitMethodPattern.test(pathName)) {
					pathName = pathName.replace(this.implicitMethodPattern, '');
					if (pathName)
						pathName = pathName.charAt(0).toLowerCase() + pathName.substr(1);
				}
				var args = this.getParameterNames(instance[actionName]);
				if (args) {
					for (var i = 0; i < args.length; i++) {
						pathName += (pathName ? '/' : '') + ':' + args[i];
					}
				}
				let controllerName = controllerData.controllerName == 'default' ? "" : controllerData.controllerName;
				this.addRoute(method, controllerName + (pathName ? '/' + pathName : ''), controllerData.viewBaseName, actionName, args, instance, controllerName);
			}
		}
	}


	getMethod(pathName, isExplicit) {
		var methodPattern = isExplicit ? this.explicitMethodPattern : this.implicitMethodPattern;
		var methodMatch = methodPattern.exec(pathName);
		var method = 'get';
		if (methodMatch && methodMatch[1]) {
			method = methodMatch[1].toLowerCase();
		}
		return method;
	}

	getParameterNames(fn) {
		var args = fn.toString().match(/^(\s*function\s+)?(?:\w*\s*)?\((.*?)\)/);
		args = args ? (args[2] ? args[2].trim().split(/\s*,\s*/) : []) : null;
		return args;
	}

	addRoute(...routeData) {
		if (!this.classesLoaded) this.classesLoaded = [];
		let loadedClass = this.classesLoaded.filter(item => {
			return item.instance === routeData[5];
		});

		var controllerClass;
		if (loadedClass && loadedClass.length > 0) {
			controllerClass = loadedClass[0].controller;
		} else {
			controllerClass = function(req, res, next, method, pathName, viewBaseName, actionName, authenticate) {
				this.req = req;
				this.res = res;
				this.next = next;
				// define a render method, that allows the view path to be implicit
				this.render = function() {
					var viewName = actionName;
					var data = {};
					if (typeof(arguments[0]) === 'string') {
						// a view name was specified, so the data was passed as second argument
						viewName = arguments[0] || viewName;
						data = arguments[1] || data;
					} else {
						// a view name was not specified, so the data was passed as first argument
						data = arguments[0] || data;
					}
					if (!data.controllerName)
						data.controllerName = routeData[6];
					if (!data.actionName) data.actionName = actionName;
					if (!data.session) data.session = this.req.session;
					if(this.req.flash !== undefined){
						data.success = this.req.flash("success");
						data.error = this.req.flash("error");
						data.info = this.req.flash("info");
					}
					res.render(viewBaseName + '/' + viewName, data);
				};
			};
			Object.setPrototypeOf(controllerClass.prototype, routeData[5]);
			this.classesLoaded.push({instance: routeData[5], controller: controllerClass});
		}

		var actionFn = (req, res, next) => {
			let actionArgs = (routeData[4] || []).map(arg => {
				return req.params[arg];
			});
			var controller = new controllerClass(req, res, next, routeData[0], routeData[1], routeData[2], routeData[3]);
			controller[routeData[3]].apply(controller, actionArgs);
		};
		this.router[routeData[0]]('/' + routeData[1].replace(/^\/+/, ''), actionFn);
	}
}

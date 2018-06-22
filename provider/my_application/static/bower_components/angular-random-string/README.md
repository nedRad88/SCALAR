angular-random-string
=====================

Angular service that generates a random alphanumeric string certain length.

## install

````bash
	$ bower install --save angular-random-string 
````

##usage

1. Load script

```html
	<script src="/path/to/angular-random-string.js"></script>
```

2. Add to your module

```javascript
	var app = angular.module('MyApp', ['angularRandomString']);
```

3. Inject to controller/service/etc.

```javascript
	app.controller('myController', function(randomString){
		var str = randomString(); // -> random alphanumeric string 10 char length
		var str32 = randomString(32); // -> random alphanumeric string 32 char length
	});
```
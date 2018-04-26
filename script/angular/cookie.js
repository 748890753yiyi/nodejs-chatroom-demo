/*
* Copyright 2013 Ivan Pusic
* Contributors:
*   Matjaz Lipus
*/
angular.module('ivpusic.cookie', ['ng']).
    factory('$cookies', ['$rootScope', '$browser', function ($rootScope, $browser) {
        var cookies = {},
            lastCookies = {},
            lastBrowserCookies,
            runEval = false,
            copy = angular.copy,
            isUndefined = angular.isUndefined;

        //creates a poller fn that copies all cookies from the $browser to service & inits the service
        $browser.addPollFn(function() {
            var currentCookies = $browser.cookies();
            if (lastBrowserCookies != currentCookies) { //relies on browser.cookies() impl
                lastBrowserCookies = currentCookies;
                copy(currentCookies, lastCookies);
                copy(currentCookies, cookies);
                if (runEval) $rootScope.$apply();
            }
        })();

        runEval = true;

        //at the end of each eval, push cookies
        //TODO: this should happen before the "delayed" watches fire, because if some cookies are not
        //      strings or browser refuses to store some cookies, we update the model in the push fn.
        $rootScope.$watch(push);

        return cookies;


        /**
         * Pushes all the cookies from the service to the browser and verifies if all cookies were
         * stored.
         */
        function push() {
            var name,
                value,
                browserCookies,
                updated;

            //delete any cookies deleted in $cookies
            for (name in lastCookies) {
                if (isUndefined(cookies[name])) {
                    $browser.cookies(name, undefined);
                }
            }

            //update all cookies updated in $cookies
            for(name in cookies) {
                value = cookies[name];
                if (!angular.isString(value)) {
                    if (angular.isDefined(lastCookies[name])) {
                        cookies[name] = lastCookies[name];
                    } else {
                        delete cookies[name];
                    }
                } else if (value !== lastCookies[name]) {
                    $browser.cookies(name, value);
                    updated = true;
                }
            }

            //verify what was actually stored
            if (updated){
                updated = false;
                browserCookies = $browser.cookies();

                for (name in cookies) {
                    if (cookies[name] !== browserCookies[name]) {
                        //delete or reset all cookies that the browser dropped from $cookies
                        if (isUndefined(browserCookies[name])) {
                            delete cookies[name];
                        } else {
                            cookies[name] = browserCookies[name];
                        }
                        updated = true;
                    }
                }
            }
        }
    }])
    .factory('cookie', ['$document','$cookies', function ($document,$cookies) {
    'use strict';

    return (function() {
        function cookieFun(key, value, options) {

            var cookies, 
                list, 
                i, 
                cookie, 
                pos, 
                name,
                hasCookies,
                all,
                expiresFor;

            options = options || {};

            if (value !== undefined) {
                // we are setting value
                value = typeof value === 'object' ? JSON.stringify(value) : String(value);

                if (typeof options.expires === 'number') {
                    expiresFor = options.expires;
                    options.expires = new Date();
                    // Trying to delete a cookie; set a date far in the past
                    if(expiresFor === -1) {
                        options.expires = new Date('Thu, 01 Jan 1970 00:00:00 GMT');
                        // A new 
                    } else {
                        options.expires.setDate(options.expires.getDate() + expiresFor);    
                    }
                }   
                return ($document[0].cookie = [
                    encodeURIComponent(key),
                    '=',
                    encodeURIComponent(value),
                    options.expires ? '; expires=' + options.expires.toUTCString() : '',
                    options.path    ? '; path=' + options.path : '',
                    options.domain  ? '; domain=' + options.domain : '',
                    options.secure  ? '; secure' : ''
                    ].join('')); 
            }

            list = [];
			
            all = $document[0].cookie;
			
            if (all) {
                list = all.split("; ");
            }

            cookies = {};
            hasCookies = false;
            for(i = 0; i < list.length; ++i) {  
                if (list[i]) {
                    cookie = list[i];
                    pos = cookie.indexOf("=");        
                    name = cookie.substring(0, pos);
                    value = decodeURIComponent(cookie.substring(pos + 1));

                    if (key === undefined || key === name) {
                        try {
                            cookies[name] = JSON.parse(value);
                        } catch (e) {
                            cookies[name] = value;
                        }
                        if (key === name) {
                            return cookies[name];
                        }
                        hasCookies = true;
                    }
                }
            }
            /*if (hasCookies && key === undefined) {
                return cookies;
            }*/
			return undefined;
        }
        cookieFun.remove = function (key, options) {

            var hasCookie = cookieFun(key) !== undefined;
            if (hasCookie) {
                if(!options) {
                    options = {};
                }
                options.expires = -1;
                cookieFun(key, '', options);
            }
            return hasCookie;
        };
        cookieFun.get=function(key){
            var hasCookie = cookieFun(key);
            if(typeof hasCookie === 'number'){
                hasCookie = hasCookie.toString();
            }
            /*if(hasCookie){
                //var value=$cookies[key];
                //return value ? angular.fromJson(value) : value;
				return hasCookie;
            }else{
                return undefined;
            }*/
			return hasCookie;
        };


        return cookieFun;
    }());
}]);

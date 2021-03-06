/*!
 * Crawl - crawler
 * Copyright(c) 2012 Mike Moulton <mike@meltmedia.com>
 * MIT Licensed
 */

var events = require("events"),
    fs = require("fs"),
    nodeio = require("node.io"),
    urlUtil = require('url'),
    crawlJob = require("./jobs/crawl");

var crawler = new events.EventEmitter();

/**
 * crawler.crawl
 *
 * Crawls a website, starting at `url`, finding all linked pages within the same domain.
 * The `url` can also be a filesystem path containing a stringified JSON object of a past crawl. This
 * can be generated using the included CLI and the '--json' option.
 *
 * This function also supports several `options`:
 *   - headers {Boolean}: include the raw http headers from the response in the results
 *   - body {Boolean}: include the http response body in results
 *
 * This function is asyncronous and requires a `callback` with the following signature:
 *   - function(err, pages)
 * where `pages` is an array with the following object structure for each result:
 *   {
 *     url: URL Object provided from Node URL parser,
 *     checksum: SHA 256 hash of the response body,
 *     links: Array of links found on this page,
 *     body: The response body (optional),
 *     headers: The response headers (optional),
 *     date: Timestamp of the page crawl
 *   }
 *
 * @param {String} http(s) url of site to crawl, or filesystem path to JSON file to import
 * @param {Object} options (optional)
 * @param {Function} callback -- function(err, pages)
 * @api public
 */
crawler.crawl = function(url, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // setup some default options for the node.io job
  options['silent'] = options['silent'] || true;
  options['crawler'] = crawler;
  options['extend'] = { methods: { input: [url] } };

	var urlParts = urlUtil.parse(url, true);

  // do a web crawl of url if it's an http protocol
	if (urlParts.protocol == "https:" || urlParts.protocol == "http:") {
	  nodeio.start(crawlJob, options, function(err, pages) {
	  	callback(err, pages);
	  }, true);
	}

  // otherwise we load a json file, assumed to be generated by the CLI using the '--json' option
  else if (urlParts.path) {
    var path = urlParts.path;
    try {
      if (fs.statSync(path).isFile()) {
        fs.readFile(path, function(err, data) {
          if (err) callback(err);

          var pages = JSON.parse(data);
          callback(null, pages);
        });
      }
    }
    catch (err) {
      callback(err);
    }
  }

  else {
    callback("Unable to interperate url as path or web address: %s", url);
  }

};

module.exports = crawler;
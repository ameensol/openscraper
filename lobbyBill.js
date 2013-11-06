var request = require('request');
var cheerio = require('cheerio');
var async   = require('async');

var url = 'http://www.opensecrets.org/lobby/billsum.php?id=129118';
var $;
// request the opensecrets page for a given url
function getBill(url, cb) {
  request(url, function(err, res, body) {
    if (err) return cb(new Error('getBill failed: ' + err));
    cb(null, body);
  });
}

function getLinks(body, cb) {
  $ = cheerio.load(body);
  var links = $('#issue_summary tbody a');
  var hrefs = [];
  Object.keys(links).forEach(function(k) {
    // console.log(links[k].attribs);
    if (links[k].attribs && !links[k].attribs.onclick) {
      var href = links[k].attribs.href;
      href = 'http://opensecrets.org/lobby/' + href;
      hrefs.push(href.replace('bills', 'sum'));
    }
  });
  cb(null, hrefs);
}

function getIndus(href, cb) {
  request(href, function(err, res, body) {
    if(err) return cb(Error('getIndus failed for ' + href + ': ' + err));
    page = cheerio.load(body);
    var rows = page('#client_indus tbody tr');
    var company = page('h1')[0].children[0].data;
    var industries = {};
    Object.keys(rows).forEach(function(k) {
      // get only the rows with children (links and numbers)
      if (rows[k].children) {
        // tr -> td(0) -> a -> text
        text = rows[k].children[0].children[0].children[0].data;
        // tr -> td(1) -> amount
        var amount = rows[k].children[1].children[0].data;
        industries[text] = amount;
      }
    });
    var data = {};
    data[company] = industries;
    cb(null, data);
  });
}

getBill(url, function(err, body) {
  if (err) throw err;
  getLinks(body, function(err, hrefs) {
    if (err) throw err;
    // console.log(hrefs);
    var internet = 0;
    var media = 0;
    var other = 0;

    async.each(hrefs, function(href, done) {
      getIndus(href, function(err, data) {
        if (err) throw err;
        console.log(data);
        Object.keys(data).forEach(function(company) {
          var industries = data[company];
          Object.keys(industries).forEach(function(indus) {
            var amount = parseInt(industries[indus].replace(',', '').replace(',', '').replace('$', '')); // This is bad and you should feel bad
            // console.log(amount);
            if (indus == 'Computers/Internet') {
              internet += amount;
            } else if (indus == 'TV/Movies/Music') {
              media += amount;
            } else {
              other += amount;
            }
          })
        });
        done();
      });
    }, function(err) {
      if (err) throw err;
      console.log('INTERNET: ' + internet);
      console.log('MEDIA: ' + media);
      console.log('OTHER: ' + other);
    });
  });
});
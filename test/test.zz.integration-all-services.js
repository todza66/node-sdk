#!/usr/env mocha
'use strict';

var fs = require('fs');

//if (fs.existsSync(__dirname + '/resources/auth.js')) {

var nock = require('nock');
var watson = require('../index');
var auth = require('./resources/auth');
var assert = require('assert');
var wav = require('wav');

var mobydick = fs.readFileSync(__dirname + '/resources/mobydick.txt', 'utf8');

var concat = require('concat-stream');
var TWENTY_SECONDS = 20000;
var THIRTY_SECONDS = 30000;
var TEN_SECONDS = 10000;
var FIVE_SECONDS = 5000;
var TWO_SECONDS = 2000;

describe('integration-all-services', function() {

  this.retries(1);

  this.slow(TWO_SECONDS); // this controls when the tests get a colored warning for taking too long

  var failIfError = function(done, err) {
    if (err)
      return done(err);
    else
      return done();
  };

  before(function() {
    nock.enableNetConnect();
  });

  after(function() {
    nock.disableNetConnect();
  });

  describe('functional_relationship_extraction', function() {
    this.timeout(FIVE_SECONDS* 4);
    var relationship_extraction = watson.relationship_extraction(auth.relationship_extraction);

    it('extract()', function(done) {
      var params = {
        text: 'IBM Watson developer cloud',
        dataset: 'ie-en-news'
      };
      relationship_extraction.extract(params, failIfError.bind(failIfError, done));
    });
  });

  describe('functional_tone_analyzer', function() {
    this.timeout(TEN_SECONDS);
    var tone_analyzer = watson.tone_analyzer(auth.tone_analyzer);

    it('tone()', function(done) {
      tone_analyzer.tone({text: mobydick}, failIfError.bind(failIfError, done));
    });

  });

  describe('functional_personality_insights', function() {
    this.timeout(FIVE_SECONDS);
    var personality_insights = watson.personality_insights(auth.personality_insights);

    it('profile()', function(done) {
      var params = {
        text: mobydick
      };
      personality_insights.profile(params, failIfError.bind(failIfError, done));
    });

    it('profile_html()', function(done) {
      var params = {
        text: '<div>' + mobydick + '</div>'
      };
      personality_insights.profile(params, failIfError.bind(failIfError, done));
    });
});

  describe('functional_visual_recognition', function() {

    describe('v3', function() {
      this.timeout(THIRTY_SECONDS * 2);
      var visual_recognition = watson.visual_recognition(auth.visual_recognition.v3);

      it('should return error when invalid api_key', function(done) {
        var constructor = auth.visual_recognition.v3;
        constructor.api_key = 'not-a-valid-key';
        var recognition = watson.visual_recognition(constructor);

        recognition.listClassifiers({}, function(err) {
          if (err) {
            return done();
          } else {
            return done('Should return an error');
          }
        });
      });

      describe('classify()', function() {
        it('should classify an uploaded image', function(done) {
          var params = {
            images_file: fs.createReadStream(__dirname + '/resources/car.png')
          };
          visual_recognition.classify(params, function(err, result) {
            if (err) {
              return done(err);
            }
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].image, 'car.png');
            assert(result.images[0].classifiers.length);
            assert(result.images[0].classifiers[0].classes.some(function(c) {
              return c.class === 'car'
            }));

            done();
          });
        });

        it('should classify an image via url', function(done) {
          var params = {
            url: 'https://watson-test-resources.mybluemix.net/resources/car.png'
          };
          visual_recognition.classify(params, function(err, result) {
            if (err) {
              return done(err);
            }
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].resolved_url, 'https://watson-test-resources.mybluemix.net/resources/car.png');
            assert.equal(result.images[0].source_url, 'https://watson-test-resources.mybluemix.net/resources/car.png');
            assert(result.images[0].classifiers.length);
            assert(result.images[0].classifiers[0].classes.some(function(c) {
              return c.class === 'car'
            }));

            done();
          });
        });
      });

      describe('detectFaces()', function() {
        this.retries(5);

        it('should detect faces in an uploaded image', function(done) {
          var params = {
            images_file: fs.createReadStream(__dirname + '/resources/obama.jpg')
          };
          visual_recognition.detectFaces(params, function(err, result) {
            if (err) {
              return done(err);
            }
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].image, 'obama.jpg');
            assert.equal(result.images[0].faces.length, 1, 'There should be exactly one face detected'); // note: the api was sometimes failing to detect any faces right after the release
            var face = result.images[0].faces[0];
            assert.equal(face.gender.gender, 'MALE');
            assert.equal(face.identity.name, 'Barack Obama');
            done();
          });
        });

        it('should detect faces in an image via url', function(done) {
          var params = {
            url: 'https://watson-test-resources.mybluemix.net/resources/obama.jpg'
          };
          visual_recognition.detectFaces(params, function(err, result) {
            if (err) {
              return done(err);
            }
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].resolved_url, 'https://watson-test-resources.mybluemix.net/resources/obama.jpg');
            assert.equal(result.images[0].source_url, 'https://watson-test-resources.mybluemix.net/resources/obama.jpg');
            assert.equal(result.images[0].faces.length, 1, 'There should be exactly one face detected'); // note: the api was sometimes failing to detect any faces right after the release
            var face = result.images[0].faces[0];
            assert.equal(face.gender.gender, 'MALE');
            assert.equal(face.identity.name, 'Barack Obama');
            done();
          });
        });
      });

      describe('recognizeText()', function() {
        it('read text in an uploaded image', function(done) {

          var params = {
            images_file: fs.createReadStream(__dirname + '/resources/car.png')
          };
          visual_recognition.recognizeText(params, function(err, result) {
            if (err) {
              return done(err);
            }

            //console.log(JSON.stringify(actual, null, 2));

            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].image, 'car.png');
            assert(result.images[0].text);
            assert(result.images[0].words.length);

            done();
          });
        });

        it('read text an image via url', function(done) {

          var params = {
            url: 'https://watson-test-resources.mybluemix.net/resources/car.png'
          };
          visual_recognition.recognizeText(params, function(err, result) {
            if (err) {
              return done(err);
            }
            //console.log(JSON.stringify(result, null, 2));

            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].resolved_url, 'https://watson-test-resources.mybluemix.net/resources/car.png');
            assert.equal(result.images[0].source_url, 'https://watson-test-resources.mybluemix.net/resources/car.png');
            assert(result.images[0].text);
            assert(result.images[0].words.length);

            done();
          });
        });
      });

      describe('listClassifiers()', function() {
        it('should return the list of classifiers', function(done) {
          visual_recognition.listClassifiers({}, function(err, result) {
            if (err) {
              return done(err);
            }
            assert(result.classifiers);
            assert(result.classifiers.length);
            assert(result.classifiers[0].classifier_id);
            assert(result.classifiers[0].name);
            assert(result.classifiers[0].status);
            done();
          });
        });
      });

      describe('getClassifier()', function() {
        // todo: we need a separate key for the SDK tests.
        // Right now it's shared with the demo and those classifiers sometimes get deleted :/
        // disabling this test in the meanwhile
        it.skip('should retrieve the classifier', function(done) {
          var expected = {
              "classifier_id": "MoleskineTypes_1855242529",
              "name": "Moleskine Types",
              "owner": "a3a48ea7-492b-448b-87d7-9dade8bde5a9",
              "status": "ready",
              "created": "2016-06-21T02:38:57.661Z",
              "classes": [{ "class": "portrait" }]};
          visual_recognition.getClassifier({classifier_id: 'MoleskineTypes_1855242529'}, function(err, classifier){
            if (err) {
              return done(err);
            }
            assert.deepEqual(classifier, expected);
            done();
          });
        });
      });
    });
  });

  describe('functional_tradeoff_analytics', function() {
    this.timeout(TWENTY_SECONDS);
    var tradeoff_analytics = watson.tradeoff_analytics(auth.tradeoff_analytics);

    it('dilemmas()', function(done) {
      var params = require('./resources/dilemma_problem');
      tradeoff_analytics.dilemmas(params, failIfError.bind(failIfError, done));
    });

    it('events()', function(done) {
      var params = require('./resources/ta_events');
      tradeoff_analytics.events(params, failIfError.bind(failIfError, done));
    });
  });

  describe.only('functional_concept_insights', function() {
    this.timeout(TEN_SECONDS);

    var sample = {
      concept: '/graphs/wikipedia/en-20120601/concepts/IBM',
      document: '/corpora/public/ibmresearcher/documents/il-AHARONA',
      corpus : '/corpora/public/ibmresearcher',
      graph: '/graphs/wikipedia/en-20120601'
    };

    var concept_insights = watson.concept_insights(auth.concept_insights);

    it('listCorpora()', function(done) {
      concept_insights.corpora.listCorpora({}, failIfError.bind(failIfError, done));
    });

    it('listCorporaWithAccountId()', function(done) {
      concept_insights.corpora.listCorpora({
        account_id: auth.concept_insights.account_id
      }, failIfError.bind(failIfError, done));
    });

    it('getAccountsInfo()', function(done) {
      concept_insights.accounts.getAccountsInfo({}, failIfError.bind(failIfError, done));
    });

    // to update
    it('getConcept()', function(done) {
      concept_insights.graphs.getConcept({
        id: sample.concept
      }, failIfError.bind(failIfError, done));
    });

    it('searchConceptByLabel()', function(done) {
      this.timeout(THIRTY_SECONDS);
      concept_insights.graphs.searchConceptByLabel({
        graph: sample.graph,
        query: 'ibm'
      }, failIfError.bind(failIfError, done));
    });

    it('getRelatedConcepts()', function(done) {
      concept_insights.graphs.getRelatedConcepts({
        graph: sample.graph,
        concepts: [sample.concept]
      }, failIfError.bind(failIfError, done));
    });

    it('annotateText()', function(done) {
      concept_insights.graphs.annotateText({
        graph: sample.graph,
        text: 'Nizar Magboul Alseddeg is currently living in Austin Texas'
      }, failIfError.bind(failIfError, done));
    });

    it('getRelationScores()', function(done) {
      concept_insights.graphs.getRelationScores({
        id: sample.concept,
        concepts: ['/graphs/wikipedia/en-20120601/concepts/Cloud_computing',
        '/graphs/wikipedia/en-20120601/concepts/Web_services']
      }, failIfError.bind(failIfError, done));
    });

    it('getCorpus()', function(done) {
      concept_insights.corpora.getCorpus({
        corpus: sample.corpus
      }, failIfError.bind(failIfError, done));
    });

    it('listDocuments()', function(done) {
      concept_insights.corpora.listDocuments({
        corpus: sample.corpus
      }, failIfError.bind(failIfError, done));
    });

    it('listGraphs()', function(done) {
      concept_insights.graphs.listGraphs({}, failIfError.bind(failIfError, done));
    });

    it('getDocument()', function(done) {
      concept_insights.corpora.getDocument({
        id: sample.document
      }, failIfError.bind(failIfError, done));
    });

    it('getDocumentAnnotations()', function(done) {
      concept_insights.corpora.getDocumentAnnotations({
        id: sample.document
      }, failIfError.bind(failIfError, done));
    });

    it('getCorpusProcessingState()', function(done) {
      concept_insights.corpora.getCorpusProcessingState({
        corpus: sample.corpus
      }, failIfError.bind(failIfError, done));
    });

    it('getCorpusStats()', function(done) {
      concept_insights.corpora.getCorpusStats({
        corpus: sample.corpus
      }, failIfError.bind(failIfError, done));
    });

    it('searchByLabel()', function(done) {
      this.timeout(THIRTY_SECONDS);
      concept_insights.corpora.searchByLabel({
        corpus: sample.corpus,
        query: 'ibm'
      }, failIfError.bind(failIfError, done));
    });

    it('getRelatedDocuments()', function(done) {
      this.timeout(THIRTY_SECONDS);
      concept_insights.corpora.getRelatedDocuments({
        corpus: sample.corpus,
        ids: [sample.concept]
      }, failIfError.bind(failIfError, done));
    });

    it('getRelatedConcepts()', function(done) {
      concept_insights.corpora.getRelatedConcepts({
        id: sample.concept
      }, failIfError.bind(failIfError, done));
    });

    it('getRelatedConcepts()', function(done) {
      concept_insights.corpora.getRelatedConcepts({
        concepts: [sample.concept],
        id: sample.concept
      }, failIfError.bind(failIfError, done));
    });

    it('getDocumentProcessingState()', function(done) {
      concept_insights.corpora.getDocumentProcessingState({
        id: sample.document
      }, failIfError.bind(failIfError, done));
    });
  });

  describe('functional_text_to_speech', function() {
    this.timeout(TWENTY_SECONDS);
    var text_to_speech = watson.text_to_speech(auth.text_to_speech);

    it('voices()', function(done) {
      text_to_speech.voices(null, failIfError.bind(failIfError, done));
    });

    it('synthesize()', function(done) {
      var params = {
        text: 'test',
        accept: 'audio/wav'
      };
      // wav.Reader parses the wav header and will throw if it isn't valid
      var reader = new wav.Reader();
      text_to_speech.synthesize(params)
        .pipe(reader)
        .on('format', done.bind(null,null));
    });
  });

  describe('functional_speech_to_text', function() {
    this.timeout(TWENTY_SECONDS);
    var speech_to_text = watson.speech_to_text(auth.speech_to_text);

    it('recognize()', function(done) {
      var params = {
        audio: fs.createReadStream(__dirname + '/resources/audio.wav'),
        content_type: 'audio/wav'
      };
      speech_to_text.recognize(params, failIfError.bind(failIfError, done));
    });

    it('getModels()', function(done) {
      speech_to_text.getModels({}, failIfError.bind(failIfError, done));
    });

    it('createRecognizeStream()',  function (done) {
      var recognizeStream = speech_to_text.createRecognizeStream({content_type: 'audio/l16; rate=44100'});
      recognizeStream.setEncoding('utf8');
      fs.createReadStream(__dirname + '/resources/audio.wav')
        .pipe(recognizeStream)
        .on('error', done)
        .pipe(concat(function (transcription) {
          assert.equal(transcription.trim(), 'thunderstorms could produce large hail isolated tornadoes and heavy rain');
          done();
        }));
    });

    it('createRecognizeStream() - no words',  function (done) {
      var recognizeStream = speech_to_text.createRecognizeStream({content_type: 'audio/l16; rate=44100'});
      recognizeStream.setEncoding('utf8');
      fs.createReadStream(__dirname + '/resources/blank.wav')
        .pipe(recognizeStream)
        .on('error', done)
        .on('data', function(text) {
          assert(!text, 'no text expected for an audio file with no words');
        })
        .on('end', done);
    });
  });

  describe('functional_dialog', function() {
    this.timeout(THIRTY_SECONDS * 3);
    var dialog = watson.dialog(auth.dialog);
    var dialog_id = auth.dialog.dialog_id;
    var client_id = 31;

    it('getProfile()', function(done) {
      var params = {
        dialog_id: dialog_id,
        client_id: client_id,
        name: ['size', 'method']
      };
      dialog.getProfile(params, failIfError.bind(failIfError, done));
    });

    it('updateProfile()', function(done) {
      var params = {
        dialog_id: dialog_id,
        client_id: client_id,
        name_values: [{
          name: 'size',
          value: 'large'
        }, {
          name: 'topping1',
          value: 'cheese'
        }]
      };
      dialog.updateProfile(params, failIfError.bind(failIfError, done));
    });

    it('getConversation()', function(done) {
      var params = {
        dialog_id: dialog_id,
        client_id: client_id,
        date_from: '2015-07-20 00:00:00',
        date_to: '2015-07-30 00:00:00'
      };
      dialog.getConversation(params, failIfError.bind(failIfError, done));
    });

    it('conversation()', function(done) {
      var params = {
        dialog_id: dialog_id,
        client_id: client_id,
        input: 'Hello'
      };
      dialog.conversation(params, failIfError.bind(failIfError, done));
    });

    // it('updateContent()', function(done) {
    //   this.timeout(10000);
    //   var params = {
    //     dialog_id: dialog_id,
    //     client_id: client_id
    //   };
    //   dialog.updateContent(params, failIfError.bind(failIfError, done));
    // });

    it('getContent()', function(done) {
      var params = {
        dialog_id: dialog_id
      };
      dialog.getContent(params, failIfError.bind(failIfError, done));
    });

    it('getDialogs()', function(done) {
      var params = {};
      dialog.getDialogs(params, failIfError.bind(failIfError, done));
    });
  });

  describe('functional_language_translator', function() {
    this.timeout(TWENTY_SECONDS * 2);
    var language_translator = watson.language_translator(auth.language_translator || auth.language_translation);

    it('getModels()', function(done) {
      language_translator.getModels(null, failIfError.bind(failIfError, done));
    });

    it('translate()', function(done) {
      var params = {
        text: 'this is a test',
        source: 'en',
        target: 'es'
      };
      language_translator.translate(params, failIfError.bind(failIfError, done));
    });

    it('getIdentifiableLanguages()', function(done) {
      language_translator.getIdentifiableLanguages(null, failIfError.bind(failIfError, done));
    });

    it('identify()', function(done) {
      var params = {
        text: 'this is an important test that needs to work'
      };
      language_translator.identify(params, failIfError.bind(failIfError, done));
    });
  });

  describe('functional_alchemy_language', function() {
    var alchemy_language = watson.alchemy_language(auth.alchemy);
    var text = fs.readFileSync(__dirname + '/resources/alchemy-text.txt', 'utf8');

    it('entities()', function(done) {
      alchemy_language.entities({
        text: text
      }, failIfError.bind(failIfError, done));
    });

    it('keywords()', function(done) {
      alchemy_language.keywords({
        text: text
      }, failIfError.bind(failIfError, done));
    });


    it('concepts()', function(done) {
      alchemy_language.concepts({
        text: text
      }, failIfError.bind(failIfError, done));
    });

    it('emotion()', function(done) {
      alchemy_language.emotion({
        text: text
      }, failIfError.bind(failIfError, done));
    });

    it('sentiment()', function(done) {
      alchemy_language.sentiment({
        text: text
      }, failIfError.bind(failIfError, done));
    });

    it('sentiment_targeted()', function(done) {
      alchemy_language.sentiment({
        text: text,
        target: 'Peter Higgs'
      }, failIfError.bind(failIfError, done));
    });

    it('sentiment_multiple_targets_with_pipe()', function(done) {
      alchemy_language.sentiment({
        text: text,
        targets: 'United States|Peter Higgs'
      }, failIfError.bind(failIfError, done));
    });

    it('sentiment_multiple_targets_with_array()', function(done) {
      alchemy_language.sentiment({
        text: text,
        targets: ['United States','Peter Higgs']
      }, failIfError.bind(failIfError, done));
    });

    it('category()', function(done) {
      alchemy_language.category({
        text: text
      }, failIfError.bind(failIfError, done));
    });

    it('publicationDate()', function(done) {
      alchemy_language.publicationDate({
        html: text
      }, failIfError.bind(failIfError, done));
    });

    it('relations()', function(done) {
      alchemy_language.relations({
        text: text
      }, failIfError.bind(failIfError, done));
    });

    it('language()', function(done) {
      alchemy_language.language({
        text: text
      }, failIfError.bind(failIfError, done));
    });

    it('text()', function(done) {
      alchemy_language.text({
        html: text
      }, failIfError.bind(failIfError, done));
    });

    it('text_raw()', function(done) {
      alchemy_language.text({
        html: text,
        raw: true
      }, failIfError.bind(failIfError, done));
    });

    it('authors()', function(done) {
      alchemy_language.authors({
        html: text
      }, failIfError.bind(failIfError, done));
    });

    it('feeds()', function(done) {
      alchemy_language.feeds({
        url: 'http://www.techcrunch.com/'
      }, failIfError.bind(failIfError, done));
    });

    it('microformats()', function(done) {
      alchemy_language.microformats({
        url: 'http://www.alchemyapi.com/products/alchemylanguage/microformats-parsing'
      }, failIfError.bind(failIfError, done));
    });

    it('taxonomy()', function(done) {
      alchemy_language.taxonomy({
        html: text
      }, failIfError.bind(failIfError, done));
    });

    it('combined()', function(done) {
      alchemy_language.combined({
        text: text
      }, failIfError.bind(failIfError, done));
    });

    describe('typedRelations()', function() {
      it('should process html', function(done) {
        alchemy_language.typedRelations({
          html: text,
          model: "ie-en-news" // todo: remove model once the API regression is fixed
        }, failIfError.bind(failIfError, done));
      });

      it('should process text', function(done) {
        alchemy_language.typedRelations({
          text: text,
          model: "ie-en-news" // todo: remove model once the API regression is fixed
        }, failIfError.bind(failIfError, done));
      });
    });
  });

  describe('functional_alchemy_data_news', function() {
    var alchemy_data_news = watson.alchemy_data_news(auth.alchemy);

    it('getNews()', function(done) {
      alchemy_data_news.getNews({
        start: 'now-1d',
        end: 'now',
        count: 100,
        'q.enriched.url.enrichedTitle.relations.relation': '|action.verb.text=acquire,object.entities.entity.type=Company|',
        return: 'enriched.url.title'
      }, failIfError.bind(failIfError, done));
    });
  });

  describe('functional_alchemy_vision', function() {
    this.timeout(TWENTY_SECONDS);
    var alchemy_vision = watson.alchemy_vision(auth.alchemy);
    var imageFile = fs.createReadStream(__dirname + '/resources/obama.jpg');

    it('getImageLinks() with url', function(done) {
      alchemy_vision.getImageLinks({
        url: 'http://www.alchemyapi.com/products/alchemylanguage/microformats-parsing'
      }, failIfError.bind(failIfError, done));
    });

    it('getImageLinks() with html', function(done) {
      alchemy_vision.getImageLinks({
        html: '<div><img src="https://watson-test-resources.mybluemix.net/resources/obama.jpg" /></div>'
      }, failIfError.bind(failIfError, done));
    });

    it('getImageKeywordsWithFile()', function(done) {
      alchemy_vision.getImageKeywords({image: imageFile}, failIfError.bind(failIfError, done));
    });

    it('getImageKeywordsWithUrl()', function(done) {
      alchemy_vision.getImageKeywords({
        url: 'https://watson-test-resources.mybluemix.net/resources/obama.jpg'
      }, failIfError.bind(failIfError, done));
    });

    // it('recognizeFacesWithFile()', function(done) {
    //   alchemy_vision.recognizeFaces({image: imageFile}, failIfError.bind(failIfError, done));
    // });

    it('recognizeFacesWithUrl()', function(done) {
      alchemy_vision.recognizeFaces({
        url: 'https://watson-test-resources.mybluemix.net/resources/obama.jpg'
      }, failIfError.bind(failIfError, done));
    });

    it('getImageSceneText()', function(done) {
      alchemy_vision.getImageSceneText({
        url: 'https://watson-test-resources.mybluemix.net/resources/open.png'
      }, failIfError.bind(failIfError, done));
    });
  });

  describe('functional_document_conversion', function() {
    this.timeout(TWENTY_SECONDS);
    describe('v1', function() {
      var document_conversion = watson.document_conversion(auth.document_conversion);

      it('convertFile()', function(done) {
        document_conversion.convert({
          file: fs.createReadStream(__dirname + '/resources/sampleWord.docx'),
          conversion_target: 'ANSWER_UNITS',
          // word: {
          //   heading: {
          //     fonts: [
          //       { level: 1, min_size: 24 },
          //       { level: 2, min_size: 16, max_size: 24 }
          //     ]
          //   }
          // }
        }, failIfError.bind(failIfError, done));
      });

      it('convertFile() with overridden content-type', function(done) {
        document_conversion.convert({
          conversion_target: 'ANSWER_UNITS',
            file: fs.createReadStream(__dirname + '/resources/sampleWordWrongExtension.html'),
          content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }, function(err, res) {
          if (err) {
            return done(err);
          }
          assert(res);
          assert(res.media_type_detected, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          assert(res.answer_units);
          assert(res.answer_units.length);
          assert(res.answer_units[0].id);
          done();
        });
      });

      it('convertFile() buffer with content-type', function(done) {
        document_conversion.convert({
          conversion_target: 'ANSWER_UNITS',
          file: new Buffer(fs.readFileSync(__dirname + '/resources/sampleWordWrongExtension.html')),
          content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }, function(err, res) {
          if (err) {
            return done(err);
          }
          assert(res);
          assert(res.media_type_detected, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          assert(res.answer_units);
          assert(res.answer_units.length);
          assert(res.answer_units[0].id);
          done();
        });
      });
    });
  });
});

// } else {
//   console.warn('no test/resources/auth.js, skipping integration tests'); // eslint-disable-line no-console
// }

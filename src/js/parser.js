/*
credits

brunt of the work by increpare (www.increpare.com)

all open source mit license blah blah

testers:
none, yet

code used

colors used
color values for named colours from arne, mostly (and a couple from a 32-colour palette attributed to him)
http://androidarts.com/palette/16pal.htm

the editor is a slight modification of codemirro (codemirror.net), which is crazy awesome.

for post-launch credits, check out activty on github.com/increpare/PuzzleScript

*/

// PS+ merge as at 23c05

const MAX_ERRORS_FOR_REAL=100;

var compiling = false;
var errorStrings = [];//also stores warning strings
var errorCount=0;//only counts errors

// used here and in compiler
const reg_commandwords = /^(afx[\w:=+-.]+|sfx\d+|cancel|checkpoint|restart|win|message|again|undo|nosave|quit|zoomscreen|flickscreen|smoothscreen|again_interval|realtime_interval|key_repeat_interval|noundo|norestart|background_color|text_color|goto|message_text_align)$/u;
const twiddleable_params = ['background_color', 'text_color', 'key_repeat_interval', 'realtime_interval', 'again_interval', 'flickscreen', 'zoomscreen', 'smoothscreen', 'noundo', 'norestart', 'message_text_align'];
const soundverbs_directional = ['move','cantmove'];

// utility functions

// return last element in array, or null
function peek(a) {
    return a && a.length > 0 ? a[a.length - 1] : null;
}

function TooManyErrors(){
    consolePrint("Too many errors/warnings; aborting compilation.",true);
    throw new Error("Too many errors/warnings; aborting compilation.");
}

function logErrorCacheable(str, lineNumber,urgent) {
    if (compiling||urgent) {
        if (lineNumber === undefined) {
            return logErrorNoLine(str,urgent);
        }
        var errorString = '<a onclick="jumpToLine(' + lineNumber.toString() + ');"  href="javascript:void(0);"><span class="errorTextLineNumber"> line ' + lineNumber.toString() + '</span></a> : ' + '<span class="errorText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString);
            errorStrings.push(errorString);
            errorCount++;
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
        }
    }
    }
}

function logError(str, lineNumber,urgent) {
    if (compiling||urgent) {
        if (lineNumber === undefined) {
            return logErrorNoLine(str,urgent);
        }
        var errorString = '<a onclick="jumpToLine(' + lineNumber.toString() + ');"  href="javascript:void(0);"><span class="errorTextLineNumber"> line ' + lineNumber.toString() + '</span></a> : ' + '<span class="errorText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
            errorCount++;
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
        }
    }
    }
}

function logWarning(str, lineNumber, urgent) {
    if (compiling||urgent) {
        if (lineNumber === undefined) {
            return logWarningNoLine(str,urgent);
        }
        var errorString = '<a onclick="jumpToLine(' + lineNumber.toString() + ');"  href="javascript:void(0);"><span class="errorTextLineNumber"> line ' + lineNumber.toString() + '</span></a> : ' + '<span class="warningText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
        }
    }
    }
}

function logWarningNoLine(str, urgent, increaseErrorCount = true) {
    if (compiling||urgent) {
        var errorString = '<span class="warningText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
            if (errorStrings.length > MAX_ERRORS_FOR_REAL) {
                TooManyErrors();
        }
        }
        if (increaseErrorCount) {
            errorCount++;
        }
    }
}


function logErrorNoLine(str,urgent) {
    if (compiling||urgent) {
        var errorString = '<span class="errorText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
        errorCount++;
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
    }
        }
    }
}

function blankLineHandle(state) {
    if (state.section === 'levels') {
            if (state.levels[state.levels.length - 1].length > 0)
            {
                state.levels.push([]);
            }
    } else if (state.section === 'objects') {
        state.objects_section = 0;
    }
}

//returns null if not delcared, otherwise declaration
//note to self: I don't think that aggregates or properties know that they're aggregates or properties in and of themselves.
function wordAlreadyDeclared(state,n) {
    if (!state.case_sensitive) {
        n = n.toLowerCase();
    }
    if (n in state.objects) {
        return state.objects[n];
    } 
    for (var i=0;i<state.legend_aggregates.length;i++) {
        var a = state.legend_aggregates[i];
        if (a[0]===n) {                                			
            return state.legend_aggregates[i];
        }
    }
    for (var i=0;i<state.legend_properties.length;i++) {
        var a = state.legend_properties[i];
        if (a[0]===n) {  
            return state.legend_properties[i];
        }
    }
    for (var i=0;i<state.legend_synonyms.length;i++) {
        var a = state.legend_synonyms[i];
        if (a[0]===n) {  
            return state.legend_synonyms[i];
        }
    }
    return null;
}

//for IE support
if (typeof Object.assign != 'function') {
  (function () {
    Object.assign = function (target) {
      'use strict';
      // We must check against these specific cases.
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
 
      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}


var codeMirrorFn = function() {
    'use strict';

    function checkNameDefined(state,candname) {
        if (state.objects[candname] !== undefined) {
            return;
        }
        for (var i=0;i<state.legend_synonyms.length;i++) {
            var entry = state.legend_synonyms[i];
            if (entry[0]==candname) {
                return;                                       
            }
        }
        for (var i=0;i<state.legend_aggregates.length;i++) {
            var entry = state.legend_aggregates[i];
            if (entry[0]==candname) {
                return;                                                                          
            }
        }
        for (var i=0;i<state.legend_properties.length;i++) {
            var entry = state.legend_properties[i];
            if (entry[0]==candname) {
                return;                                    
            }
        }

        logError(`You're talking about ${candname.toUpperCase()} but it's not defined anywhere.`, state.lineNumber);
    }

    function registerOriginalCaseName(state,candname,mixedCase,lineNumber){

        function escapeRegExp(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }

        var nameFinder;
        if (state.case_sensitive) {
            nameFinder = new RegExp("\\b" + escapeRegExp(candname) + "\\b");
        } else {
            nameFinder = new RegExp("\\b" + escapeRegExp(candname) + "\\b", "i");
            }
        var match = mixedCase.match(nameFinder);
        if (match!=null){
            state.original_case_names[candname] = match[0];
            state.original_line_numbers[candname] = lineNumber;
        }
    }

    const sectionNames = ['objects', 'legend', 'sounds', 'collisionlayers', 'rules', 'winconditions', 'levels'];
    const reg_name = /([\p{L}\p{N}_]+)[\p{Z}]*/u;///\w*[a-uw-zA-UW-Z0-9_]/;
    const reg_soundseed = /^(\d+|afx:[\w:=+-.]+)\b\s*/u;
    const reg_sectionNames = /(objects|collisionlayers|legend|sounds|rules|winconditions|levels)(?![\p{L}\p{N}_])[\p{Z}\s]*/ui;
    const reg_equalsrow = /[\=]+/;
    const reg_csv_separators = /[ \,]*/;
    const reg_soundverbs = /^(move|action|create|destroy|cantmove)\b[\p{Z}\s]*/u;    // todo:reaction
    const reg_soundevents = /^(sfx\d+|undo|restart|titlescreen|startgame|cancel|endgame|startlevel|endlevel|showmessage|closemessage)\b[\p{Z}\s]*/u;

    // todo: reaction, mclick
    const reg_directions = /^(lclick|rclick|action|up|down|left|right|\^|v|\<|\>|moving|stationary|parallel|perpendicular|horizontal|orthogonal|vertical|no|randomdir|random)$/;
    const reg_loopmarker = /^(startloop|endloop)$/;
    const reg_ruledirectionindicators = /^(up|down|left|right|horizontal|vertical|orthogonal|late|rigid)$/;
    const reg_sounddirectionindicators = /^[\p{Z}\s]*(up|down|left|right|horizontal|vertical|orthogonal)(?![\p{L}\p{N}_])[\p{Z}\s]*/u;
    const reg_winconditionquantifiers = /^(all|any|no|some)$/;
    const keyword_array = ['checkpoint','objects', 'collisionlayers', 'legend', 'sounds', 'rules', '...','winconditions', 'levels',
        '|','[',']','up', 'down', 'left', 'right', 'late','rigid', '^','v','\>','\<','no','randomdir','random', 'horizontal', 'vertical',
        'any', 'all', 'no', 'some', 'moving','stationary','parallel','perpendicular','action','message', "move", "action", "create", 
        "destroy", "cantmove", "sfx0", "sfx1", "sfx2", "sfx3", "Sfx4", "sfx5", "sfx6", "sfx7", "sfx8", "sfx9", "sfx10", "cancel", "checkpoint", 
        "restart", "win", "message", "again", "undo", "restart", "titlescreen", "startgame", "cancel", "endgame", "startlevel", "endlevel", 
        "showmessage", "closemessage"];
    const preamble_keywords = ['run_rules_on_level_start', 'require_player_movement', 'debug', 
        'verbose_logging', 'throttle_movement', 'noundo', 'noaction', 'norestart', 'norepeat_action', 'scanline',
        'case_sensitive', 'level_select', 'continue_is_level_select', 'level_select_lock', 
        'settings', 'runtime_metadata_twiddling', 'runtime_metadata_twiddling_debug', 
        'smoothscreen_debug', 'skip_title_screen', 'nokeyboard'];
    const preamble_param_text = ['title', 'author', 'homepage', 'custom_font', 'text_controls'];
    const preamble_param_number = ['key_repeat_interval', 'realtime_interval', 'again_interval', 
        'tween_length', 'local_radius', 'tween_snap', 'local_radius', 'font_size', 'sprite_size', 
        'level_select_unlocked_ahead', 'level_select_unlocked_rollover', 'animate_interval'];
    const preamble_param_single = ['color_palette', 'youtube', 'background_color', 'text_color',
        'flickscreen', 'zoomscreen', 'level_select_solve_symbol', 
        'mouse_left', 'mouse_drag', 'mouse_right', 'mouse_rdrag', 'mouse_up', 'mouse_rup', 
        'tween_easing', 'message_text_align', 
        'text_message_continue', 'sitelock_origin_whitelist', 
        'sitelock_hostname_whitelist'];
    const preamble_param_multi = ['smoothscreen', 'puzzlescript'];
    const preamble_tables = [preamble_keywords, preamble_param_text, preamble_param_number, 
        preamble_param_single, preamble_param_multi];
    const color_names = ['black', 'white', 'darkgray', 'lightgray', 'gray', 'grey', 'darkgrey', 'lightgrey',
        'red', 'darkred', 'lightred', 'brown', 'darkbrown', 'lightbrown', 'orange', 'yellow', 'green', 'darkgreen',
        'lightgreen', 'blue', 'lightblue', 'darkblue', 'purple', 'pink', 'transparent'];

    // updated for // comment style
    let reg_notcommentstart = /[^\(]+/;
    let reg_match_until_commentstart_or_whitespace = /[^\p{Z}\s\()]+[\p{Z}\s]*/u;

    // lexer functions

    // match by regex, eat white space, optional return tolower
    function MatchRegex(stream, regex, tolower) {
        const match = stream.match(regex);
        if (match) stream.eatSpace();
        return !match ? null : tolower ? match[0].toLowerCase() : match[0];
    }
    
    function errorFallbackMatchToken(stream){
        var match=stream.match(reg_match_until_commentstart_or_whitespace, true);
        if (match===null){
            //just in case, I don't know for sure if it can happen but, just in case I don't 
            //understand unicode and the above doesn't match anything, force some match progress.
            match=stream.match(reg_notcommentstart, true);                                    
        }
        return match;
    }

    function processLegendLine(state, mixedCase){
        var ok=true;
        var splits = state.current_line_wip_array;
        if (splits.length===0){
            return;
        }

        if (splits.length === 1) {
            logError('Incorrect format of legend - should be one of "A = B", "A = B or C [ or D ...]", "A = B and C [ and D ...]".', state.lineNumber);
            ok=false;
        } else if (splits.length%2===0){
            logError(`Incorrect format of legend - should be one of "A = B", "A = B or C [ or D ...]", "A = B and C [ and D ...]", but it looks like you have a dangling "${state.current_line_wip_array[state.current_line_wip_array.length-1].toUpperCase()}"?`, state.lineNumber);
            ok=false;
        } else {
            var candname = splits[0];

            var alreadyDefined = wordAlreadyDeclared(state,candname);
            if (alreadyDefined!==null){
                logError(`Name "${candname.toUpperCase()}" already in use (on line <a onclick="jumpToLine(${alreadyDefined.lineNumber});" href="javascript:void(0);"><span class="errorTextLineNumber">line ${alreadyDefined.lineNumber}</span></a>).`, state.lineNumber);
                ok=false;
            }

            if (keyword_array.includes(candname)) {
                logWarning('You named an object "' + candname.toUpperCase() + '", but this is a keyword. Don\'t do that!', state.lineNumber);
            }


            for (var i=2; i<splits.length; i+=2){
                var nname = splits[i];
                if (nname===candname){
                    logError("You can't define object " + candname.toUpperCase() + " in terms of itself!", state.lineNumber);
                    ok=false;
                    var idx = splits.indexOf(candname, 2);
                    while (idx >=2){
                        if (idx>=4){
                            splits.splice(idx-1, 2);
                        } else {
                            splits.splice(idx, 2);
                        }
                        idx = splits.indexOf(candname, 2);
                    }          
                }   
                for (var j=2;j<i;j+=2){
                    var oname = splits[j];
                    if(oname===nname){
                        logWarning("You're repeating the object " + oname.toUpperCase() + " here multiple times on the RHS.  This makes no sense.  Don't do that.", state.lineNumber);                        
                    }
                }                       
            } 

            //for every other word, check if it's a valid name
            for (var i=2;i<splits.length;i+=2){
                var defname = splits[i];
                if (defname!==candname){//we already have an error message for that just above.
                    checkNameDefined(state,defname);
                }
            }

            if (splits.length === 3) {
                //SYNONYM
                var synonym = [splits[0], splits[2]];
                synonym.lineNumber = state.lineNumber;
                registerOriginalCaseName(state,splits[0],mixedCase,state.lineNumber);
                state.legend_synonyms.push(synonym);
            } else if (splits[3]==='and') {
                //AGGREGATE
                var substitutor = function(n) {
                    if (!state.case_sensitive) {
                        n = n.toLowerCase();
                    }
                    if (n in state.objects) {
                        return [n];
                    }
                    for (var i = 0; i < state.legend_synonyms.length; i++) {
                        var a = state.legend_synonyms[i];
                        if (a[0] === n) {
                            return substitutor(a[1]);
                        }
                    }
                    for (var i = 0; i < state.legend_aggregates.length; i++) {
                        var a = state.legend_aggregates[i];
                        if (a[0] === n) {
                            return [].concat.apply([], a.slice(1).map(substitutor));
                        }
                    }
                    for (var i = 0; i < state.legend_properties.length; i++) {
                        var a = state.legend_properties[i];
                        if (a[0] === n) {
                            logError("Cannot define an aggregate (using 'and') in terms of properties (something that uses 'or').", state.lineNumber);
                            ok = false;
                            return [n];
                        }
                    }
                    return [n];
                };

                var newlegend = [splits[0]].concat(substitutor(splits[2])).concat(substitutor(splits[4]));
                for (var i = 6; i < splits.length; i += 2) {
                    newlegend = newlegend.concat(substitutor(splits[i]));
                }
                newlegend.lineNumber = state.lineNumber;

                registerOriginalCaseName(state,newlegend[0],mixedCase,state.lineNumber);
                state.legend_aggregates.push(newlegend);

            } else if (splits[3]==='or'){
                var malformed=true;

                var substitutor = function(n) {

                    if (!state.case_sensitive) {
                        n = n.toLowerCase();
                    }
                    if (n in state.objects) {
                        return [n];
                    }

                    for (var i=0;i<state.legend_synonyms.length;i++) {
                        var a = state.legend_synonyms[i];
                        if (a[0]===n) {   
                            return substitutor(a[1]);
                        }
                    }
                    for (var i=0;i<state.legend_aggregates.length;i++) {
                        var a = state.legend_aggregates[i];
                        if (a[0]===n) {           
                            logError("Cannot define a property (something defined in terms of 'or') in terms of aggregates (something that uses 'and').", state.lineNumber);
                            malformed=false;          
                        }
                    }
                    for (var i=0;i<state.legend_properties.length;i++) {
                        var a = state.legend_properties[i];
                        if (a[0]===n) {  
                            var result = [];
                            for (var j=1;j<a.length;j++){
                                if (a[j]===n){
                                    //error here superfluous, also detected elsewhere (cf 'You can't define object' / #789)
                                    //logError('Error, recursive definition found for '+n+'.', state.lineNumber);                                
                                } else {
                                    result = result.concat(substitutor(a[j]));
                                }
                            }
                            return result;
                        }
                    }
                    return [n];
                };

                for (var i = 5; i < splits.length; i += 2) {
                    if (splits[i].toLowerCase() !== 'or') {
                        malformed = false;
                        break;
                    }
                }
                if (malformed) {
                    var newlegend = [splits[0]].concat(substitutor(splits[2])).concat(substitutor(splits[4]));
                    for (var i = 6; i < splits.length; i += 2) {
                        newlegend.push(state.case_sensitive ? splits[i] : splits[i].toLowerCase());
                    }
                    newlegend.lineNumber = state.lineNumber;

                    registerOriginalCaseName(state,newlegend[0],mixedCase,state.lineNumber);
                    state.legend_properties.push(newlegend);
                }
            } else {
                if (ok){
                    //no it's not ok but we don't know why
                    logError('This legend-entry is incorrectly-formatted - it should be one of A = B, A = B or C ( or D ...), A = B and C (and D ...)', state.lineNumber);
                    ok=false;
                }
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse a SOUNDS line, extract parsed information, return array of tokens
    function parseSounds(stream, state) {
        const tokens = buildTokens();
        if (tokens.length > 0 && !tokens.some(t => t.kind == 'ERROR')) {
            parseTokens(tokens);
            state.sounds.push(...createSoundRows(tokens));
        }
        return tokens;

        // build a list of tokens and kinds
        function buildTokens() {
            const tokens = [];
            while (!stream.eol()) {
                const token = MatchRegex(stream, /[A-Za-z0-9_:=+-.]+/, true);
                if (!token) {
                    if (!matchComment(stream, state)) {
                        //depending on whether the verb is directional or not, we log different errors
                        const dirok = peek(tokens) && peek(tokens).token !== 'SOUND' && tokens.some(p => soundverbs_directional.includes(p.token));
                        const msg = dirok ? "direction or sound seed" : "sound seed";
                        const token = stream.match(reg_notcommentstart)[0];
                        logError(`Ah I was expecting a ${msg} after ${peek(tokens).token}, but I don't know what to make of "${token}".`, state.lineNumber);
                        tokens.push({
                            token: token, kind: 'ERROR', pos: stream.pos
                        });
                    }
                    return tokens;
                }
                const kind = token.match(reg_soundevents) ? 'SOUNDEVENT'
                : token.match(reg_soundverbs) ? 'SOUNDVERB' 
                : token.match(reg_soundseed) ? 'SOUND'
                : token.match(reg_sounddirectionindicators) ? 'DIRECTION'
                : token.match(reg_name) ? (wordAlreadyDeclared(state, token) ? 'NAME' : 'ERROR')
                : 'ERROR';
                tokens.push({
                    token: token, kind: kind, pos: stream.pos
                });
            }
            return tokens;
        }

        function parseTokens(tokens) {
            if (tokens[0].kind == 'NAME') {
                // player move [ up... ] 142315...
                if (!wordAlreadyDeclared(state, tokens[0].token)) {
                    logError(`unexpected sound token "${tokens[0].token}".`, state.lineNumber);
                    tokens[0].kind = 'ERROR';
                } 
                if (!(tokens[1] && tokens[1].kind) == 'SOUNDVERB') {
                    logError("Was expecting a soundverb here (MOVE, DESTROY, CANTMOVE, or the like), but found something else.", state.lineNumber);                                
                    tokens[1].kind = 'ERROR';
                } 
                let i = 2;
                const dirok = soundverbs_directional.includes(tokens[1].token);
                while (dirok && tokens[i] && tokens[i].kind == 'DIRECTION')
                    ++i;
                while (tokens[i]) {
                    if (tokens[i].kind == 'SOUND') ++i;
                    else {
                        const msg = dirAllowed ? "direction or sound seed" : "sound seed";
                        logError(`Ah I was expecting a ${msg} after ${lastTokenType}, but I don't know what to make of "${match[0].toUpperCase()}".`, state.lineNumber);
                        tokens[i].kind = 'ERROR';
                        break;
                    }
                }
    
            } else if (tokens[0].kind == 'SOUNDEVENT') {
                // closemessage 1241234...
                if (tokens[1].kind != 'SOUND') {
                    logError("Was expecting a sound seed here (a number like 123123, like you generate by pressing the buttons above the console panel), but found something else.", state.lineNumber);                                
                    tokens[1].kind = 'ERROR';
                }

            } else logWarning("Was expecting a sound event (like SFX3, or ENDLEVEL) or an object name, but didn't find either.", state.lineNumber);                        
        }

        function createSoundRows(tokens){
            const seeds = tokens.filter(s => s.kind == 'SOUND').map(s => s.token);
            if (tokens[0].kind == 'NAME') {
                const dirs = tokens.filter(s => s.kind == 'DIRECTION').map(s => s.token);
                return seeds.map(s => [ 'SOUND', tokens[0].token, tokens[1].token, dirs, s, state.lineNumber ]);
                //return seeds.map(s => ({ kind: 'SOUND', name: s.token, dirs: dirs, seed: s, line: state.lineNumber }));
            } else { // 'SOUNDEVENT'
                return seeds.map(s => [ 'SOUNDEVENT', tokens[0].token, s, state.lineNumber ]);
                //return seeds.map(s => ({ kind: 'SOUNDEVENT', name: s.token, seed: s, line: state.lineNumber }));
            }
        }
    }

    // because of all the early-outs in the token function, this is really just right now attached
    // too places where we can early out during the legend. To make it more versatile we'd have to change 
    // all the early-outs in the token function to flag-assignment for returning outside the case 
    // statement.
    function endOfLineProcessing(state, mixedCase){
        if (state.section==='legend'){
            processLegendLine(state,mixedCase);
        // } else if (state.section ==='sounds'){
        //     processSoundsLine(state);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // return true and swallow any kind of comment
    function matchComment(stream, state) {
        stream.match(/\s*/);
        if (stream.eol()) 
            return state.commentLevel > 0;
        if (!state.commentStyle && stream.match(/^(\/\/)|\(/, false)) {
            if (stream.match(/\//, false)) {
                state.commentStyle = '//';
                reg_notcommentstart = /(.(?!\/\/))+/;
                //reg_notcommentstart = /.+(?=\/\/)?/;

            } else {
                state.commentStyle = '()';
                reg_notcommentstart = /[^\(]+/;
            }
        }
        // handle // comments
        if (state.commentStyle == '//'){
            if (!stream.match('//'))
                return false;
            stream.match(/.*/);
            return true;
        }
        // handle () comments
        if (state.commentLevel == 0) {
            if(!stream.match('('))
                return false;
            state.commentLevel = 1;
        }
        while (state.commentLevel > 0) {
            stream.match(/[^\(\)]*/);
            if (stream.eol())
                break;
            if (stream.match('('))
                state.commentLevel++;
            else if (stream.match(')'))
                state.commentLevel--;
        }
        return true;
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse a PRELUDE line, extract parsed information, return array of tokens
    function parsePrelude(stream, state) {
        const tokens = buildTokens();
        if (tokens.length > 0 && !tokens.some(t => t.kind == 'ERROR')) {
            const value = parseTokens(tokens);
            if (value)
                setState(state, value);
        }
        return tokens;

        // functions

        // build a list of tokens and kinds
        function buildTokens() {
            const tokens = [];
            while (!stream.eol()) {
                let token = '';
                let kind = 'ERROR'
                if (tokens.length == 1 && preamble_param_text.includes(tokens[0].token)) {
                    token = MatchRegex(stream, /.*/).trim();  // take it all
                    kind = 'METADATATEXT';
                } else {
                    token = MatchRegex(stream, /[\w-.+#*]+/, true);
                    if (!token) {
                        if (matchComment(stream, state)) return tokens;
                        logError('Unrecognised stuff in the prelude.', state.lineNumber);
                        token = MatchRegex(stream, reg_notcommentstart);
                    } else {
                        if (tokens.length == 0)
                            kind = preamble_tables.some(t => t.includes(token)) ? 'METADATA' : 'ERROR'
                        else kind = (token in colorPalettes.arnecolors) ? 'COLOR COLOR-' + token.toUpperCase()
                        : (token === "transparent") ? 'COLOR FADECOLOR'
                        : token.match(/^#[0-9a-fA-F]+$/) ? 'MULTICOLOR' + token
                        : 'METADATATEXT';
                    }
                }
                tokens.push({
                    token: token, kind: kind, pos: stream.pos
                });
            }
            return tokens;
        }

        function parseTokens(tokens) {
            const token = tokens[0].token;
            const args = tokens.slice(1).map(t => t.token);
            let value = null;
            if (state.metadata_lines[token]) {
                var otherline = state.metadata_lines[token];
                logWarning(`You've already defined a ${token} in the prelude on line <a onclick="jumpToLine(${otherline})>${otherline}</a>.`, state.lineNumber);
            }
            if (preamble_keywords.includes(token)) {
                if (tokens.length > 1)
                    logError(`Keyword requires no parameters but you gave it one.`, state.lineNumber);
                else value = [token, true];
            } else if (preamble_param_number.includes(token)) {
                if (args.length != 1 || !parseFloat(args[0]))
                    logError(`MetaData ${token} requires one numeric argument.`, state.lineNumber);
                else value = [token, parseFloat(args[0])];
            } else if (preamble_param_single.includes(token) || preamble_param_text.includes(token)) {
                if (args.length != 1)
                    logError(`MetaData ${token} requires exactly one argument, but you gave it ${args.length}.`, state.lineNumber);
                else value = [token, args[0]];
            } else if (preamble_param_multi.includes(token)) {
                if (args.length < 1)
                    logError(`MetaData ${token} has no parameters, but it needs at least one.`, state.lineNumber);
                else value = [token, args.join(' ')];
            }
            return value;
        }

        function setState(state, value) {
            state.metadata.push(...value);
            if (value[0] == 'sprite_size')
                state.sprite_size = Math.round(value[1]);
            if (value[0] == 'case_sensitive') {
                state.case_sensitive = true;
                if (state.metadata.keys().some(k => preamble_param_text.includes(k)))
                    logWarningNoLine("Please make sure that CASE_SENSITIVE comes before any case sensitive prelude setting.", false, false)
            }
        }

    }

    ////////////////////////////////////////////////////////////////////////////
    // parse and store an object name, return token type
    function parseObjectName(stream, mixedCase, state) {
        function parseCopySprite() {
            const match = state.objects_section > 0 ? stream.match(reg_name) : null;
            if (!match) {
                const junk = stream.match(reg_notcommentstart, true);
                logWarning(`Invalid sprite copy: ${junk}.`, state.lineNumber);
                return 'ERROR'
            }
            let cloneName = match[0];
            if (state.objects[state.objects_candname].cloneSprite != "") {
                logError(`You already assigned a sprite parent for ${cloneName}, you can't have more than one!`, state.lineNumber);
                return 'ERROR';
            } else if (cloneName == state.objects_candname) {
                logError(`You attempted to set the sprite parent for ${cloneName} to itself! Please don't."`, state.lineNumber)
                return 'ERROR';
            } else {
                state.objects[state.objects_candname].cloneSprite = cloneName;
                //state.objects_section = 1;
                return "SPRITEPARENT";
            }
        }

        // look for an object name, alias/glyph or copy:
        if (stream.match(/copy:/)) 
            return parseCopySprite();

        let match_name = stream.match(reg_name);
        if (!match_name && state.objects_section > 0)
            match_name = stream.match(/([^\s])\s*/);  // glyph
        if (!match_name) {
            const junk = stream.match(reg_notcommentstart, true);
            if (stream.pos > 0)
                logWarning(`Invalid object name in object section: ${junk}.`, state.lineNumber);
            return 'ERROR';
        } 

        const candname = match_name[1];
        if (state.objects[candname]) {
            logError(`Object "${candname}" defined multiple times.`, state.lineNumber);
            return 'ERROR';
        }
        for (let i = 0; i < state.legend_synonyms.length; i++) {
            var entry = state.legend_synonyms[i];
            if (entry[0] == candname) {
                logError(`Name "${candname}" already in use.`, state.lineNumber);
            }
        }
        if (keyword_array.includes(candname)) {
                logWarning(`You named an object "${candname}", but this is a keyword. Don't do that!`, state.lineNumber);
        }
        // create base object and array for colours
        if (state.objects_section == 0) {
            state.objects_candname = candname;
            registerOriginalCaseName(state, candname, mixedCase, state.lineNumber);
            state.objects[state.objects_candname] = {       // doc: array of objects { lineNumber:,colors:,spritematrix } indexed by name
                lineNumber: state.lineNumber,
                colors: [],
                spritematrix: [],
                cloneSprite: "",
                spriteText: null
            };
            state.objects[candname].colors = [];
        } else {
            //set up alias
            registerOriginalCaseName(state, candname, mixedCase, state.lineNumber);
            var synonym = [candname, state.objects_candname];
            synonym.lineNumber = state.lineNumber;
            state.legend_synonyms.push(synonym);
        }
        if (state.case_sensitive) {
            if ((candname.toLowerCase() == "player" && candname != "player") || (candname.toLowerCase() == "background" && candname != "background")) {
                // setup aliases for special objects
                var synonym = [candname.toLowerCase(), state.objects_candname];
                synonym.lineNumber = state.lineNumber;
                state.legend_synonyms.push(synonym);
            }
        }
        state.objects_section = 1;  // repeat this section to get next name
        return 'NAME';
    };

    ////////////////////////////////////////////////////////////////////////////
    function parseObjectColor(stream, state) {
        const match_color = stream.match(/([#\w]+)\s*/, true);
        const candcol = match_color ? match_color[1].toLowerCase() : null;
        if (!(candcol && (color_names.includes(candcol) || candcol.match(/#([0-9a-f]{2}){3,4}|#([0-9a-f]{3,4})/)))) {
            const tail = stream.match(reg_notcommentstart, true);
            logError(`Was looking for color for object ${state.objects_candname}, got "${candcol || tail}" instead.`, state.lineNumber);
            return 'ERROR';
        } 

        state.objects[state.objects_candname].colors.push(candcol);
        return (candcol in colorPalettes.arnecolors) ? `COLOR COLOR-${candcol.toUpperCase()}`
            : (candcol === "transparent") ? 'COLOR FADECOLOR'
            : `MULTICOLOR${candcol}`;
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse sprite grid, one cell at a time (to show them coloured)
    function parseObjectSprite(stream, state) {
        let ch = stream.next();
        if (ch.match(/.\d/)) {
            logError(`Unknown character "${ch}" in sprite matrix for object ${state.objects_candname}.`, state.lineNumber);
            stream.match(reg_notcommentstart, true);
            return 'ERROR';
        }

        let obj = state.objects[state.objects_candname];
        let spritematrix = state.objects_spritematrix;
        spritematrix[spritematrix.length - 1] += ch;
        obj.spritematrix = spritematrix;

        if (ch !== '.') {
            let n = parseInt(ch);
            if (n >= obj.colors.length) {
                logError(`Trying to access color number ${n} from the color palette of sprite ${state.objects_candname}, but there are only ${obj.colors.length} defined in it."`, state.lineNumber);
                return 'ERROR';
            }
            if (isNaN(n)) {
                logError(`Invalid character "${ch} " in sprite for ${state.objects_candname}`, state.lineNumber);
                return 'ERROR';
            }
            return 'COLOR BOLDCOLOR COLOR-' + obj.colors[n].toUpperCase();
        }
        return 'COLOR FADECOLOR';
    }

    function parseObjectText(stream, state, mixedCase) {
        const pos = stream.pos;
        const arg = stream.match(reg_notcommentstart, true);
        if (!arg || arg[0].trim() == '') {
            logError(`Object text needs a value.`, state.lineNumber);
            return 'ERROR';
        }
        const obj = state.objects[state.objects_candname];
        obj.spriteText = mixedCase.substring(pos, stream.pos).trim();
        return 'COLOR BOLDCOLOR COLOR-' + obj.colors[0].toUpperCase();
    }

    ////////////////////////////////////////////////////////////////////////////
    // called as per CodeMirror API
    // return value is an object containing a specific set of named functions
    return {
        copyState: function(state) {
            var objectsCopy = {};
            for (var i in state.objects) {
              if (state.objects.hasOwnProperty(i)) {
                var o = state.objects[i];
                objectsCopy[i] = {
                  colors: o.colors.concat([]),
                  lineNumber : o.lineNumber,
                  spritematrix: o.spritematrix.concat([]),
                  spriteText: o.spriteText
                  // bug: why no copy of cloneSprite?
                }
              }
            }

            var collisionLayersCopy = [];
            for (var i = 0; i < state.collisionLayers.length; i++) {
              collisionLayersCopy.push(state.collisionLayers[i].concat([]));
            }

            var legend_synonymsCopy = [];
            var legend_aggregatesCopy = [];
            var legend_propertiesCopy = [];
            var soundsCopy = [];
            var levelsCopy = [];
            var winConditionsCopy = [];
            var rulesCopy = [];

            for (var i = 0; i < state.legend_synonyms.length; i++) {
              legend_synonymsCopy.push(state.legend_synonyms[i].concat([]));
            }
            for (var i = 0; i < state.legend_aggregates.length; i++) {
              legend_aggregatesCopy.push(state.legend_aggregates[i].concat([]));
            }
            for (var i = 0; i < state.legend_properties.length; i++) {
              legend_propertiesCopy.push(state.legend_properties[i].concat([]));
            }
            for (var i = 0; i < state.sounds.length; i++) {
              soundsCopy.push(state.sounds[i].concat([]));
            }
            for (var i = 0; i < state.levels.length; i++) {
              levelsCopy.push(state.levels[i].concat([]));
            }
            for (var i = 0; i < state.winconditions.length; i++) {
              winConditionsCopy.push(state.winconditions[i].concat([]));
            }
            for (var i = 0; i < state.rules.length; i++) {
              rulesCopy.push(state.rules[i].concat([]));
            }

            var original_case_namesCopy = Object.assign({},state.original_case_names);
            var original_line_numbersCopy = Object.assign({},state.original_line_numbers);
            
            var nstate = {
              lineNumber: state.lineNumber,

              objects: objectsCopy,
              collisionLayers: collisionLayersCopy,

              commentLevel: state.commentLevel,
              commentStyle: state.commentStyle,
              section: state.section,
              visitedSections: state.visitedSections.concat([]),

              line_should_end: state.line_should_end,
              line_should_end_because: state.line_should_end_because,
              sol_after_comment: state.sol_after_comment,

              objects_candname: state.objects_candname,
              objects_section: state.objects_section,
              objects_spritematrix: state.objects_spritematrix.concat([]),

              tokenIndex: state.tokenIndex,
              // PS+ SECTION command argument if any
              currentSection: state.currentSection,
              current_line_wip_array: state.current_line_wip_array.concat([]),

              legend_synonyms: legend_synonymsCopy,
              legend_aggregates: legend_aggregatesCopy,
              legend_properties: legend_propertiesCopy,

              sounds: soundsCopy,

              rules: rulesCopy,

              names: state.names.concat([]),

              winconditions: winConditionsCopy,

              original_case_names : original_case_namesCopy,
              original_line_numbers : original_line_numbersCopy,

              abbrevNames: state.abbrevNames.concat([]),

              metadata : state.metadata.concat([]),
              metadata_lines: Object.assign({}, state.metadata_lines),

              sprite_size : state.sprite_size,

              case_sensitive : state.case_sensitive,

              levels: levelsCopy,

              STRIDE_OBJ : state.STRIDE_OBJ,
              STRIDE_MOV : state.STRIDE_MOV
            };

            return nstate;        
        },
        blankLine: function(state) {
            if (state.section === 'levels') {
                    if (state.levels[state.levels.length - 1].length > 0)
                    {
                        state.levels.push([]);
                    }
            }
        },
        // function is called to successively find tokens and return a token type in a source code line
        // note: there is no end of line marker, the next line will follow immediately
        token: function(stream, state) {
           	var mixedCase = stream.string;
            //console.log(`Input line ${mixedCase}`)
            var sol = stream.sol();
            if (sol) {
                state.current_line_wip_array = [];

                // PS+ leaves original text unchanged, which means a lot of checking in other places
                if(!state.case_sensitive) {
                    stream.string = stream.string.toLowerCase();
                }
                state.tokenIndex=0;
                state.line_should_end = false;
            }
            if (state.sol_after_comment){
                sol = true;
                state.sol_after_comment = false;
            }

            if (state.tokenIndex !== -4 && matchComment(stream, state)) {
                state.sol_after_comment = state.sol_after_comment  || sol;
                if (stream.eol())
                    endOfLineProcessing(state, mixedCase);  
                return 'comment';
            }

            stream.eatWhile(/[ \t]/);

            if (sol && stream.eol()) {
                endOfLineProcessing(state,mixedCase);  
                return blankLineHandle(state);
            }

            if (state.commentStyle === '()' && stream.match(')')) {
                logWarning("You're trying to close a comment here, but I can't find any opening bracket to match it? [This is highly suspicious; you probably want to fix it.]", state.lineNumber);
                stream.skipToEnd();
                return 'ERROR';
            } else if (state.commentStyle === '//' && stream.match(/[\(\)]/)) {
                logWarning("You're trying to use the wrong type of comment here.[This is highly suspicious; you probably want to fix it.]", state.lineNumber);
                stream.skipToEnd();
                return 'ERROR';
            }

            if (state.line_should_end && !stream.eol()) {
                logError('Only comments should go after ' + state.line_should_end_because + ' on a line.', state.lineNumber);
                stream.skipToEnd();
                return 'ERROR';
            }            

            //MATCH '==="s AT START OF LINE
            if (sol && stream.match(reg_equalsrow, true)) {
                state.line_should_end = true;
                state.line_should_end_because = 'a bunch of equals signs (\'===\')';
                return 'EQUALSBIT';
            }

            //MATCH SECTION NAME
            var sectionNameMatches = stream.match(reg_sectionNames, true);
            if (sol && sectionNameMatches) {

                state.section = sectionNameMatches[0].trim().toLowerCase();
                if (state.visitedSections.indexOf(state.section) >= 0) {
                    logError('cannot duplicate sections (you tried to duplicate \"' + state.section.toUpperCase() + '").', state.lineNumber);
                }
                state.line_should_end = true;
                state.line_should_end_because = `a section name ("${state.section.toUpperCase()}")`;
                state.visitedSections.push(state.section);
                var sectionIndex = sectionNames.indexOf(state.section);

                var name_plus = state.case_sensitive ? state.section : state.section.toUpperCase()
                if (sectionIndex == 0) {
                    state.objects_section = 0;
                    if (state.visitedSections.length > 1) {
                        logError('section "' + name_plus + '" must be the first section', state.lineNumber);
                    }
                } else if (state.visitedSections.indexOf(sectionNames[sectionIndex - 1]) == -1) {
                    if (sectionIndex===-1) {
                        logError('no such section as "' + name_plus + '".', state.lineNumber);
                    } else {
                        logError('section "' + name_plus + '" is out of order, must follow  "' + sectionNames[sectionIndex - 1].toUpperCase() + '" (or it could be that the section "'+sectionNames[sectionIndex - 1].toUpperCase()+`"is just missing totally.  You have to include all section headings, even if the section itself is empty).`, state.lineNumber);                            
                    }
                }

                if (state.section === 'objects'){
                    if (!state.commentStyle)
                        state.commentStyle = '()';
                } else if (state.section === 'sounds') {
                    //populate names from rules
                    for (var n in state.objects) {
                        if (state.objects.hasOwnProperty(n)) {
                            state.names.push(n);
                        }
                    }
                    //populate names from legends
                    for (var i = 0; i < state.legend_synonyms.length; i++) {
                        var n = state.legend_synonyms[i][0];
                        state.names.push(n);
                    }
                    for (var i = 0; i < state.legend_aggregates.length; i++) {
                        var n = state.legend_aggregates[i][0];
                        state.names.push(n);
                    }
                    for (var i = 0; i < state.legend_properties.length; i++) {
                        var n = state.legend_properties[i][0];
                        state.names.push(n);
                    }
                }
                else if (state.section === 'levels') {
                    //populate character abbreviations
                    for (var n in state.objects) {
                        if (state.objects.hasOwnProperty(n) && n.length == 1) {
                            state.abbrevNames.push(n);
                        }
                    }

                    for (var i = 0; i < state.legend_synonyms.length; i++) {
                        if (state.legend_synonyms[i][0].length == 1) {
                            state.abbrevNames.push(state.legend_synonyms[i][0]);
                        }
                    }
                    for (var i = 0; i < state.legend_aggregates.length; i++) {
                        if (state.legend_aggregates[i][0].length == 1) {
                            state.abbrevNames.push(state.legend_aggregates[i][0]);
                        }
                    }
                }
                return 'HEADER';
            } else {
                if (state.section === undefined) {
                    logError('must start with section "OBJECTS"', state.lineNumber);
                }
            }

            if (stream.eol()) {
                endOfLineProcessing(state,mixedCase);  
                return null;
            }

            //if color is set, try to set matrix
            //if can't set matrix, try to parse name
            //if color is not set, try to parse color
            switch (state.section) {
                case '': {
                    if (sol) {
                        stream.string = mixedCase;  // put it back, for now!
                        state.current_line_wip_array = parsePrelude(stream, state);
                    }
                    if (state.current_line_wip_array.length > 0) {
                        const token = state.current_line_wip_array.shift();
                        stream.pos = token.pos;
                        return token.kind;
                    } 
                }
                case 'objects': {
                    if (sol)
                        state.current_line_wip_array = [mixedCase];
                    else mixedCase = state.current_line_wip_array[0];

                    if (state.objects_section == 1 || state.objects_section == 2) {
                        if (sol || (state.commentStyle == '//' && stream.match(/;\s*/)))
                            state.objects_section++;
                    }

                    //console.log(`objects_section ${state.objects_section} at ${state.lineNumber}: ${mixedCase}`);
                    switch (state.objects_section) {
                    case 0:
                    case 1: { //LOOK FOR NAME(s)
                            state.objects_spritematrix = [];
                            return parseObjectName(stream, mixedCase, state);
                        }
                    case 2: { //LOOK FOR COLOR(s)
                            return parseObjectColor(stream, state);
                        }
                    case 3: {
                            if (stream.match(/text/u, true))
                                return parseObjectText(stream, state, mixedCase);
                            // if not a grid char assume missing blank line and go to next object
                            if (sol && !stream.match(/^[.\d]/, false)) {
                                state.objects_section = 0;
                                return parseObjectName(stream, mixedCase, state);
                            }
                            if (sol)
                                state.objects_spritematrix.push('');
                            return parseObjectSprite(stream, state);
                        }
                    }
                    break;
                }

                case 'legend': {
                    var resultToken="";
                    var match_name=null;
                    if (state.tokenIndex === 0) {
                        match_name=stream.match(/[^=\p{Z}\s\(]*(\p{Z}\s)*/u, true);
                        var new_name=match_name[0].trim();
                        
                        if (wordAlreadyDeclared(state,new_name))
                        {
                            resultToken =  'ERROR';
                        } else {
                            resultToken =  'NAME';    
                            }

                        //if name already declared, we have a problem                            
                        state.tokenIndex++;
                    } else if (state.tokenIndex === 1) {
                        match_name = stream.match(/=/u,true);                              
                        if (match_name===null||match_name[0].trim()!=="="){
                            logError(`In the legend, define new items using the equals symbol - declarations must look like "A = B", "A = B or C [ or D ...]", "A = B and C [ and D ...]".`, state.lineNumber);
                            stream.match(reg_notcommentstart, true);
                            resultToken = 'ERROR';
                            match_name=["ERROR"];//just to reduce the chance of crashes
                            }
                        stream.match(/[\p{Z}\s]*/u, true);
                        state.tokenIndex++;
                        resultToken = 'ASSSIGNMENT';
                    } else if (state.tokenIndex >= 3 && ((state.tokenIndex % 2) === 1)) {
                        //matches AND/OR
                        match_name = stream.match(reg_name, true);
                        if (match_name === null) {
                            logError("Something bad's happening in the LEGEND", state.lineNumber);
                            match=stream.match(reg_notcommentstart, true);
                            resultToken = 'ERROR';
                        } else {
                            var candname = match_name[0].trim();
                            if (candname === "and" || candname === "or"){                                             
                                resultToken =  'LOGICWORD';
                                if (state.tokenIndex>=5){
                                    if (candname !== state.current_line_wip_array[3]){
                                        logError("Hey! You can't go mixing ANDs and ORs in a single legend entry.", state.lineNumber);
                                        resultToken = 'ERROR';
                            }
                                }
                            } else {
                                logError(`Expected and 'AND' or an 'OR' here, but got ${candname.toUpperCase()} instead. In the legend, define new items using the equals symbol - declarations must look like 'A = B' or 'A = B and C' or 'A = B or C'.`, state.lineNumber);
                                resultToken = 'ERROR';
                                // match_name=["and"];//just to reduce the chance of crashes
                            }
                        }
                        state.tokenIndex++;
                    } else {
                        match_name = stream.match(reg_name, true);
                        if (match_name === null) {
                            logError("Something bad's happening in the LEGEND", state.lineNumber);
                            match=stream.match(reg_notcommentstart, true);
                            resultToken = 'ERROR';
                        } else {
                            var candname = match_name[0].trim();
                            if (wordAlreadyDeclared(state,candname))
                            {
                                resultToken =  'NAME';    
                            } else {
                                resultToken =  'ERROR';
                            }
                                state.tokenIndex++;

                        }
                    }

                    if (match_name!==null) {
                        state.current_line_wip_array.push(match_name[0].trim());
                    }
                    
                    if (stream.eol()) {
                        processLegendLine(state,mixedCase);
                    } 

                    return resultToken;
                    break;
                }

                // SOUND DEFINITION:
                // SOUNDEVENT ~ INT (Sound events take precedence if there's name overlap)
                // OBJECT_NAME
                //     NONDIRECTIONAL_VERB ~ INT
                //     DIRECTIONAL_VERB
                //         INT
                //         DIR+ ~ INT
                case 'sounds': {
                    if (sol) 
                        state.current_line_wip_array = parseSounds(stream, state);
                    if (state.current_line_wip_array.length > 0) {
                        const token = state.current_line_wip_array.shift();
                        stream.pos = token.pos;
                        return token.kind;
                    } 
                }

                case 'collisionlayers': {
                    if (sol) {
                        //create new collision layer
                        state.collisionLayers.push([]);
                        //empty current_line_wip_array
                        state.current_line_wip_array = [];
                        state.tokenIndex=0;
                    }

                    var match_name = stream.match(reg_name, true);
                    if (match_name === null) {
                        //then strip spaces and commas
                        var prepos=stream.pos;
                        stream.match(reg_csv_separators, true);
                        if (stream.pos==prepos) {
                            logError("error detected - unexpected character " + stream.peek(),state.lineNumber);
                            stream.next();
                        }
                        return null;
                    } else {
                        //have a name: let's see if it's valid
                        var candname = match_name[0].trim();

                        var substitutor = function(n) {
                        if (!state.case_sensitive) {
                                n = n.toLowerCase();
                            }
                            if (n in state.objects) {
                                return [n];
                            } 


                            for (var i=0;i<state.legend_synonyms.length;i++) {
                                var a = state.legend_synonyms[i];
                                if (a[0]===n) {           
                                    return substitutor(a[1]);
                                }
                            }

                            for (var i=0;i<state.legend_aggregates.length;i++) {
                                var a = state.legend_aggregates[i];
                                if (a[0]===n) {           
                                    logError('"'+n+'" is an aggregate (defined using "and"), and cannot be added to a single layer because its constituent objects must be able to coexist.', state.lineNumber);
                                    return [];         
                                }
                            }
                            for (var i=0;i<state.legend_properties.length;i++) {
                                var a = state.legend_properties[i];
                                if (a[0]===n) {  
                                    var result = [];
                                    for (var j=1;j<a.length;j++){
                                        if (a[j]===n){
                                            //error here superfluous, also detected elsewhere (cf 'You can't define object' / #789)
                                            //logError('Error, recursive definition found for '+n+'.', state.lineNumber);                                
                                        } else {
                                            result = result.concat(substitutor(a[j]));
                                        }
                                    }
                                    return result;
                                }
                            }
                        // PS+ to fix
                        logError('Cannot add "' + candname.toUpperCase() + '" to a collision layer; it has not been declared.', state.lineNumber);                                
                        //logError('Cannot add "' + candname + '" to a collision layer; it has not been declared.', state.lineNumber);                                
                            return [];
                        };
                        if (candname.toLowerCase()==='background' ) {
                            if (state.collisionLayers.length>0&&state.collisionLayers[state.collisionLayers.length-1].length>0) {
                                logError("Background must be in a layer by itself.",state.lineNumber);
                            }
                            state.tokenIndex=1;
                        } else if (state.tokenIndex!==0) {
                            logError("Background must be in a layer by itself.",state.lineNumber);
                        }

                        var ar = substitutor(candname);

                        if (state.collisionLayers.length===0) {
                            logError("no layers found.",state.lineNumber);
                            return 'ERROR';
                        }
                        
                        var foundOthers=[];
                    var foundSelves=[];
                        for (var i=0;i<ar.length;i++){
                        var tcandname = ar[i];
                            for (var j=0;j<=state.collisionLayers.length-1;j++){
                                var clj = state.collisionLayers[j];
                            if (clj.indexOf(tcandname)>=0){
                                if (j!==state.collisionLayers.length-1){
                                        foundOthers.push(j);
                                } else {
                                    foundSelves.push(j);
                                    }
                                }
                            }
                        }
                        if (foundOthers.length>0){
                        // PS+ to fix for case_sensitive
                        var warningStr = 'Object "'+candname.toUpperCase()+'" included in multiple collision layers ( layers ';
                            for (var i=0;i<foundOthers.length;i++){
                                warningStr+="#"+(foundOthers[i]+1)+", ";
                            }
                            warningStr+="#"+state.collisionLayers.length;
                            logWarning(warningStr +' ). You should fix this!',state.lineNumber);                                        
                        }

                if (state.current_line_wip_array.indexOf(candname)>=0){
                    var warningStr = 'Object "'+candname.toUpperCase()+'" included explicitly multiple times in the same layer. Don\'t do that innit.';
                    logWarning(warningStr,state.lineNumber);         
                }
                state.current_line_wip_array.push(candname);

                        state.collisionLayers[state.collisionLayers.length - 1] = state.collisionLayers[state.collisionLayers.length - 1].concat(ar);
                        if (ar.length>0) {
                            return 'NAME';                            
                        } else {
                            return 'ERROR';
                        }
                    }
                    break;
                }
                case 'rules': {                    	
                        if (sol) {
                            var rule = reg_notcommentstart.exec(stream.string)[0];
                            state.rules.push([rule, state.lineNumber, mixedCase]);
                            state.tokenIndex = 0;//in rules, records whether bracket has been found or not
                        }

                        if (state.tokenIndex===-4) {
                            stream.skipToEnd();
                            return 'MESSAGE';
                        }
                        if (stream.match(/[\p{Z}\s]*->[\p{Z}\s]*/u, true)) {
                            return 'ARROW';
                        }
                        var ch = stream.peek();
                        if (ch === '[' || ch === '|' || ch === ']' || ch==='+') {
                            if (ch!=='+') {
                                state.tokenIndex = 1;
                            }
                            stream.next();
                            stream.match(/[\p{Z}\s]*/u, true);
                            return 'BRACKET';
                        } else {
                            var m = stream.match(/[^\[\|\]\p{Z}\s]*/u, true)[0].trim();

                            if (state.tokenIndex===0&&reg_loopmarker.exec(m)) {
                                return 'BRACKET';
                            } else if (state.tokenIndex === 0 && reg_ruledirectionindicators.exec(m)) {
                                stream.match(/[\p{Z}\s]*/u, true);
                                return 'DIRECTION';
                            } else if (state.tokenIndex === 1 && reg_directions.exec(m)) {
                                stream.match(/[\p{Z}\s]*/u, true);
                                return 'DIRECTION';
                            } else {
                                if (state.names.indexOf(m) >= 0) {
                                    if (sol) {
                                logError('Objects cannot appear outside of square brackets in rules, only directions can.', state.lineNumber);
                                        return 'ERROR';
                                    } else {
                                        stream.match(/[\p{Z}\s]*/u, true);
                                        return 'NAME';
                                    }
                                }
                                
                                m = m.toLowerCase();
                                if (m==='...') {
                                    return 'DIRECTION';
                                } else if (m==='rigid') {
                                    return 'DIRECTION';
                                } else if (m==='random') {
                                    return 'DIRECTION';
                                } else if (m==='global') {
                                    return 'DIRECTION';
                                }else if (m.match(reg_commandwords)) {
                                    if (m==='message' || m==='goto' || twiddleable_params.includes(m)) {
                                        state.tokenIndex=-4;
                                    }                                	
                                    return 'COMMAND';
                                } else {
                                    logError('Name "' + m + '", referred to in a rule, does not exist.', state.lineNumber);
                                    return 'ERROR';
                                }
                            }
                        }

                        break;
                    }
                case 'winconditions': {
                    if (sol) {
                        var tokenized = reg_notcommentstart.exec(stream.string);
                        var splitted = tokenized[0].split(/[\p{Z}\s]/u);
                        var filtered = splitted.filter(function(v) {return v !== ''});
                        filtered.push(state.lineNumber);
                        
                        state.winconditions.push(filtered);
                        state.tokenIndex = -1;
                    }
                    state.tokenIndex++;

                    var match = stream.match(/[\p{Z}\s]*[\p{L}\p{N}_]+[\p{Z}\s]*/u);
                    if (match === null) {
                        logError('incorrect format of win condition.', state.lineNumber);
                        stream.match(reg_notcommentstart, true);
                        return 'ERROR';
                    } else {
                        var candword = match[0].trim();
                        if (state.tokenIndex === 0) {
                            if (reg_winconditionquantifiers.exec(candword)) {
                                return 'LOGICWORD';
                            } else {
                                logError('Expecting the start of a win condition ("ALL","SOME","NO") but got "' + candword.toUpperCase() + "'.", state.lineNumber);
                                return 'ERROR';
                            }
                        } else if (state.tokenIndex === 2) {
                            // PS+ to fix 
                            if (candword != 'on') {
                                logError('Expecting the word "ON" but got "' + candword.toUpperCase() + "\".", state.lineNumber);
                                return 'ERROR';
                            } else {
                                return 'LOGICWORD';
                            }
                        } else if (state.tokenIndex === 1 || state.tokenIndex === 3) {
                            if (state.names.indexOf(candword) === -1) {
                                // PS+ to fix
                                logError('Error in win condition: "' + candword.toUpperCase() + '" is not a valid object name.', state.lineNumber);
                                return 'ERROR';
                            } else {
                                return 'NAME';
                            }
                        } else {
                            logError("Error in win condition: I don't know what to do with "+candword.toUpperCase()+".", state.lineNumber);
                            return 'ERROR';
                        }
                    }
                    break;
                }
                case 'levels': {
                    if (sol) {
                        if (stream.match(/[\p{Z}\s]*message\b[\p{Z}\s]*/ui, true)) {
                        // PS+ -4/2/3/4 = message/level/section/goto ???
                        state.tokenIndex = -4;//-4/2 = message/level
                        var newdat = ['\n', mixedCase.slice(stream.pos).trim(), state.lineNumber, state.currentSection];
                            if (state.levels[state.levels.length - 1].length == 0) {
                                state.levels.splice(state.levels.length - 1, 0, newdat);
                            } else {
                                state.levels.push(newdat);
                            }
                            return 'MESSAGE_VERB';//a duplicate of the previous section as a legacy thing for #589 
                        } else if (stream.match(/[\p{Z}\s]*message[\p{Z}\s]*/ui, true)) {//duplicating previous section because of #589
                            logWarning("You probably meant to put a space after 'message' innit.  That's ok, I'll still interpret it as a message, but you probably want to put a space there.",state.lineNumber);
                        // PS+ //1/2/3/4 = message/level/section/goto???
                        state.tokenIndex = -4;//-4/2 = message/level
                        var newdat = ['\n', mixedCase.slice(stream.pos).trim(), state.lineNumber, state.currentSection];
                            if (state.levels[state.levels.length - 1].length == 0) {
                                state.levels.splice(state.levels.length - 1, 0, newdat);
                            } else {
                                state.levels.push(newdat);
                            }
                            return 'MESSAGE_VERB';
                    // PS+
                        } else if (stream.match(/\s*section\s*/i, true)) {
                            state.tokenIndex = 3;//1/2/3/4 = message/level/section/goto
                            state.currentSection = mixedCase.slice(stream.pos).trim();
                            return 'SECTION_VERB';
                        } else if (stream.match(/\s*goto\s*/i, true)) {
                            state.tokenIndex = 4;//1/2/3/4 = message/level/section/goto
                            var newdat = ['goto', mixedCase.slice(stream.pos).trim(), state.lineNumber, state.currentSection];
                            if (state.levels[state.levels.length - 1].length == 0) {
                                state.levels.splice(state.levels.length - 1, 0, newdat);
                            } else {
                                state.levels.push(newdat);
                            }
                            return 'GOTO_VERB';
                        } else {
                            var matches = stream.match(reg_notcommentstart, false);
                            if (matches===null || matches.length===0){
                                logError("Detected a comment where I was expecting a level. Oh gosh; if this is to do with you using '(' as a character in the legend, please don't do that ^^",state.lineNumber);
                                state.commentLevel++;
                                stream.skipToEnd();
                                return 'comment';
                            } else {
                                var line = matches[0].trim();
                                state.tokenIndex = 2;
                                var lastlevel = state.levels[state.levels.length - 1];
                            // PS+ this change still on borrowed time
                                if (lastlevel[0] == '\n') {
                                    state.levels.push([state.lineNumber, state.currentSection, line]);
                                } else {
                                    if (lastlevel.length==0)
                                    {
                                        lastlevel.push(state.lineNumber);
                                    // PS+
                                        lastlevel.push(state.currentSection);
                                }
                                    lastlevel.push(line);

                                // PS+
                                if (lastlevel.length>2) 
                                    {
                                        if (line.length!=lastlevel[2].length) {
                                            logWarning("Maps must be rectangular, yo (In a level, the length of each row must be the same).",state.lineNumber);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        if (state.tokenIndex == -4) {
                                stream.skipToEnd();
                                return 'MESSAGE';
                        } else if (state.tokenIndex == 3) {
                            stream.skipToEnd();
                            return 'SECTION';
                        } else if (state.tokenIndex == 4) {
                            stream.skipToEnd();
                            return 'GOTO';
                        }
                    }

                    if (state.tokenIndex === 2 && !stream.eol()) {
                        var ch = stream.peek();
                        stream.next();
                        if (state.abbrevNames.indexOf(ch) >= 0) {
                            return 'LEVEL';
                        } else {
                        // PS+ case
                        logError('Key "' + ch.toUpperCase() + '" not found. Do you need to add it to the legend, or define a new object?', state.lineNumber);
                            return 'ERROR';
                        }
                    }
                    break;
                }
                        
                default: { 
                    throw 'oops!';
                }
	        }
            // end of switch

            if (stream.eol()) {
                return null;
            }

            if (!stream.eol()) {
                stream.next();
                return null;
            }
        },
        startState: function() {
            return {
                /*
                    permanently useful
                */
                objects: {},

                /*
                    for parsing
                */
                lineNumber: 0,

                commentLevel: 0,  // trigger comment style
                commentStyle: null,

                section: '',  // prelude
                visitedSections: [],

                line_should_end: false,
                line_should_end_because: '',
                sol_after_comment: false,

                objects_candname: '',
                objects_section: 0, //whether reading name/color/spritematrix
                objects_spritematrix: [],

                collisionLayers: [],

                tokenIndex: 0,

                currentSection: null,
                current_line_wip_array: [],

                legend_synonyms: [],
                legend_aggregates: [],
                legend_properties: [],

                sounds: [],
                rules: [],

                names: [],

                winconditions: [],
                metadata: [],
                metadata_lines: {},

                sprite_size: 5,

                case_sensitive: false,

                original_case_names: {},
                original_line_numbers: {},

                abbrevNames: [],

                levels: [[]],

                subsection: ''
            };
        }
    };
};

window.CodeMirror.defineMode('puzzle', codeMirrorFn);

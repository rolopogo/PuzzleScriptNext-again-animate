/*
Credits

Brunt of the work by increpare (www.increpare.com), with many contributions by others over the years

This code comes from the PuzzleScriptPlus fork, with major features added by Auroriax, gathered from forks by many others.

This version is PuzzleScriptNext, by Davidus of Polyomino Games.

Color values for named colours from arne, mostly (and a couple from a 32-colour palette attributed to him)
http://androidarts.com/palette/16pal.htm

The editor is a slight modification of codemirror (codemirror.net), which is crazy awesome.
Testing is based on Qunit

For more information see:
    github.com/increpare/PuzzleScript
    github.com/Auroriax/PuzzleScriptNext
    github.com/david-pfx/PuzzleScriptNext

*/

const MAX_ERRORS_FOR_REAL=100;

var compiling = false;
var errorStrings = [];//also stores warning strings
var errorCount=0;//only counts errors

// used here and in compiler
const reg_commandwords = /^(afx[\w:=+-.]+|sfx\d+|cancel|checkpoint|restart|win|message|again|undo|nosave|quit|zoomscreen|flickscreen|smoothscreen|again_interval|realtime_interval|key_repeat_interval|noundo|norestart|background_color|text_color|goto|message_text_align|status)$/u;
const commandwords_table = ['cancel', 'checkpoint', 'restart', 'win', 'message', 'again', 'undo', 'nosave', 'quit', 'zoomscreen', 'flickscreen', 'smoothscreen', 
    'again_interval', 'realtime_interval', 'key_repeat_interval', 'noundo', 'norestart', 'background_color', 'text_color', 'goto', 'message_text_align', 'status'];
const commandargs_table = ['message', 'goto', 'status'];
const twiddleable_params = ['background_color', 'text_color', 'key_repeat_interval', 'realtime_interval', 'again_interval', 'flickscreen', 'zoomscreen', 'smoothscreen', 'noundo', 'norestart', 'message_text_align'];
const soundverbs_directional = ['move','cantmove'];
const soundverbs_other = [ 'create', 'destroy' ];
let soundverbs_movement = [ 'action' ];  // clicks to be added
let directions_table = ['action', 'up', 'down', 'left', 'right', '^', 'v', '<', '>', 
    'moving', 'stationary', 'parallel', 'perpendicular', 'horizontal', 'orthogonal', 'vertical', 'no', 'randomdir', 'random'];
let directions_only = ['>', '\<', '\^', 'v', 'up', 'down', 'left', 'right', 'action', 'moving', 
    'stationary', 'no', 'randomdir', 'random', 'horizontal', 'vertical', 'orthogonal', 'perpendicular', 'parallel'];
const mouse_clicks_table = ['lclick', 'rclick']; // gets appended

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

function logWarningNoLine(str, urgent, increaseErrorCount = false) {
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

    const sectionNames = ['objects', 'legend', 'sounds', 'collisionlayers', 'rules', 'winconditions', 'levels'];
    const reg_name = /([\p{L}\p{N}_]+)[\p{Z}]*/u;///\w*[a-uw-zA-UW-Z0-9_]/;
    const reg_soundseed = /^(\d+|afx:[\w:=+-.]+)\b/i;
    const reg_equalsrow = /[\=]+/;
    const reg_csv_separators = /[ \,]*/;
    const reg_soundevents = /^(sfx\d+|undo|restart|titlescreen|startgame|cancel|endgame|startlevel|endlevel|showmessage|closemessage)\b/i;

    const reg_loopmarker = /^(startloop|endloop)$/;
    const reg_ruledirectionindicators = /^(up|down|left|right|horizontal|vertical|orthogonal|late|rigid)$/;
    const reg_sounddirectionindicators = /^(up|down|left|right|horizontal|vertical|orthogonal)\b/i;
    const reg_winconditionquantifiers = /^(all|any|no|some)$/;

    const keyword_array = [ 'checkpoint', 'objects', 'collisionlayers', 'legend', 'sounds', 'rules', 'winconditions', 'levels',
        '|', '[', ']', 'up', 'down', 'left', 'right', 'late', 'rigid', '^', 'v', '>', '<', 'no', 'randomdir', 'random', 'horizontal', 'vertical',
        'any', 'all', 'no', 'some', 'moving', 'stationary', 'parallel', 'perpendicular', 'action', 'message', 'move', 
        'create', 'destroy', 'cantmove', 'sfx0', 'sfx1', 'sfx2', 'sfx3', 'Sfx4', 'sfx5', 'sfx6', 'sfx7', 'sfx8', 'sfx9', 'sfx10', 
        'cancel', 'checkpoint', 'restart', 'win', 'message', 'again', 'undo', 'restart', 'titlescreen', 'startgame', 'cancel', 'endgame', 
        'startlevel', 'endlevel', 'showmessage', 'closemessage' ];
    const prelude_keywords = ['case_sensitive', 'continue_is_level_select', 'debug', 'level_select', 'level_select_lock', 
        'mouse_clicks', 'noaction', 'nokeyboard', 'norepeat_action', 'norestart', 'noundo', 'require_player_movement', 
        'run_rules_on_level_start', 'runtime_metadata_twiddling', 'runtime_metadata_twiddling_debug', 'scanline', 
        'skip_title_screen', 'smoothscreen_debug', 'status_line', 'throttle_movement', 'verbose_logging'];
    const prelude_param_text = ['title', 'author', 'homepage', 'custom_font', 'text_controls', 'text_message_continue'];
    const prelude_param_number = ['again_interval', 'animate_interval', 'font_size', 'key_repeat_interval', 
        'level_select_unlocked_ahead', 'level_select_unlocked_rollover', 'local_radius', 'realtime_interval', 
        'sprite_size', 'tween_length', 'tween_snap'];
    const prelude_param_single = [
        'background_color', 'color_palette', 'flickscreen', 'level_select_solve_symbol', 'message_text_align', 
        'mouse_drag', 'mouse_left', 'mouse_rdrag', 'mouse_right', 'mouse_rup', 'mouse_up',
        'sitelock_hostname_whitelist', 'sitelock_origin_whitelist', 'text_color', 'tween_easing', 'zoomscreen'
    ];
    const prelude_param_multi = ['smoothscreen', 'puzzlescript', 'youtube' ];
    const prelude_tables = [prelude_keywords, prelude_param_text, prelude_param_number, 
        prelude_param_single, prelude_param_multi];
    const color_names = ['black', 'white', 'darkgray', 'lightgray', 'gray', 'grey', 'darkgrey', 'lightgrey',
        'red', 'darkred', 'lightred', 'brown', 'darkbrown', 'lightbrown', 'orange', 'yellow', 'green', 'darkgreen',
        'lightgreen', 'blue', 'lightblue', 'darkblue', 'purple', 'pink', 'transparent'];

    // updated for // comment style
    let reg_notcommentstart = /[^\(]+/;
    let reg_match_until_commentstart_or_whitespace = /[^\p{Z}\s\()]+[\p{Z}\s]*/u;

    // utility functions used by parser

    // return last element in array, or null
    function peek(a) {
        return a && a.length > 0 ? a[a.length - 1] : null;
    }

    //returns null if not delcared, otherwise declaration
    //note to self: I don't think that aggregates or properties know that they're aggregates or properties in and of themselves.
    function wordAlreadyDeclared(state, name) {
        let def
        if (name in state.objects) 
            return state.objects[name];
        else if (def = state.legend_synonyms.find(s => s[0] == name))
            return def;
        else if (def = state.legend_aggregates.find(s => s[0] == name))
            return def;
        else if (def = state.legend_properties.find(s => s[0] == name))
            return def;
        else return null;
    }

    // recursively expand a symbol into its ultimate constituents of objects
    // callback to handle error
    function expandSymbol(state, name, isand, cbError) {
        if (name in state.objects) 
            return [name];
        for (const sym of state.legend_synonyms)
            if (sym[0] == name) 
                return expandSymbol(state, sym[1], isand);
        for (const sym of state.legend_aggregates) {
            if (sym[0] == name) {
                if (!isand)
                    cbError(name);
                return sym.slice(1).flatMap(s => expandSymbol(state, s, false));
            }
        }
        for (const sym of state.legend_properties) {
            if (sym[0] == name) {
                if (isand)
                    cbError(name);
                return sym.slice(1).flatMap(s => expandSymbol(state, s, true));
            }
        }
    }

    function registerOriginalCaseName(state,candname,mixedCase,lineNumber){
        function escapeRegExp(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }

        const nameFinder = state.case_sensitive 
            ? new RegExp("\\b" + escapeRegExp(candname) + "\\b")
            : new RegExp("\\b" + escapeRegExp(candname) + "\\b", "i");
        var match = mixedCase.match(nameFinder);
        if (match!=null){
            state.original_case_names[candname] = match[0];
            state.original_line_numbers[candname] = lineNumber;
        }
    }

    function createAlias(state, alias, candname, lineno) {
        //if (debugLevel) console.log(`Create '${alias}' as alias for '${candname}'`);
        const synonym = [alias, candname];
        synonym.lineNumber = lineno;
        state.legend_synonyms.push(synonym);
    }

    //----- lexer functions -----

    // class Lexer
    class Lexer {
        tokens = [];

        constructor(stream, state) {
            this.stream = stream;
            this.state = state;
        }

        pushToken(token, kind) {
            this.tokens.push({ 
                text: token, 
                kind: kind, 
                pos: this.stream.pos 
            });
            this.matchPos = this.stream.pos;
        }

        get tokens() {
            return this.tokens;
        }

        pushBack() {
            this.stream.pos = this.matchPos;
        }

        checkComment() {
            const token = matchComment(this.stream, this.state);
            if (token != null)
                this.pushToken(token, 'comment');
        }
        
        checkEol() { 
            this.checkComment();
            return this.stream.eol(); 
        }

        checkEolSemi() { 
            this.checkComment();
            if (this.state.commentStyle == '//' && this.match(/^;/)) {
                this.pushToken(';', 'SEMICOLON');
                return true;
            }
            return this.stream.eol(); 
        }

        next() {
            return this.stream.next();
        }

        match(regex, tolower = false) {
            this.matchPos = this.stream.pos;
            const token = this.stream.match(regex);
            if (token) this.stream.eatSpace();
            return !token ? null : tolower ? token[0].toLowerCase() : token[0];
        }

        matchAll() {
            return (this.match(/.*/) || '').trim();
        }
        
        matchNotComment() {
            return (this.match(reg_notcommentstart) || '').trim();
        }

        matchToken(tolower) {
            return this.match(/^\S+/, tolower);
        }
    
        matchName(tolower) {
            return this.match(/^[\p{L}\p{N}_$]+/u, tolower);
        }
    
        matchNameOrGlyph(tolower) {
            return this.match(/^[\p{L}\p{N}_$]+/u, tolower) || this.match(/^\S/, tolower);
        }
    
    }

    // match by regex, eat white space, optional return tolower, with pushback
    let matchPos = 0;
    function matchRegex(stream, regex, tolower) {
        matchPos = stream.pos;
        const match = stream.match(regex);
        if (match) stream.eatSpace();
        return !match ? null : tolower ? match[0].toLowerCase() : match[0];
    }
    
    function pushBack(stream) {
        stream.pos = matchPos;
    }

    function matchName(stream, tolower) {
        return matchRegex(stream, /^[\p{L}\p{N}_$]+/u, tolower);
    }

    function matchNameOrGlyph(stream, tolower) {
        return matchRegex(stream, /^[\p{L}\p{N}_$]+/u, tolower) || matchRegex(stream, /^\S/, tolower);
    }

    ////////////////////////////////////////////////////////////////////////////
    // return any kind of comment if found, or null if not
    // updates eol and commentLevel
    function matchComment(stream, state) {
        stream.match(/\s*/);
        if (stream.eol()) 
            return (state.commentLevel > 0) ? '' : null;
        // set comment style if first time
        if (!state.commentStyle && stream.match(/^(\/\/)|\(/, false)) {
            if (stream.match(/\//, false)) {
                state.commentStyle = '//';
                reg_notcommentstart = /(.(?!\/\/))+/;

            } else {
                state.commentStyle = '()';
                reg_notcommentstart = /[^\(]+/;
            }
        }
        // handle // comments
        if (state.commentStyle == '//'){
            if (!stream.match('//'))
                return null;
            return stream.match(/.*/)[0];
        }
        // handle () comments
        if (state.commentLevel == 0 && stream.peek() != '(')
            return null;
        const pos = stream.pos;
        do {
            stream.match(/[^\(\)]*/);
            if (stream.eol())
                break;
            if (stream.match('('))
                state.commentLevel++;
            else if (stream.match(')'))
                state.commentLevel--;
        } while (state.commentLevel > 0);
        stream.eatSpace();
        return stream.string.slice(pos, stream.pos);
    }

    function blankLineHandle(state) {
        if (state.section == 'levels') {
            const toplevel = peek(state.levels);
            if (toplevel && toplevel.length > 0)
                state.levels.push([]);
        } else if (state.section == 'objects') {
            state.objects_section = 0;
        }
    }
    
    ////////////////////////////////////////////////////////////////////////////
    // parse a SECTION line, validate order etc
    function parseSection(stream, state) {
        const section = matchRegex(stream, /^\w+/, true);

        if (!sectionNames.includes(section)) {
            pushBack(stream);
            return false;
        }

        state.section = section;
        if (state.visitedSections.includes(state.section)) {
            logError(`cannot duplicate sections (you tried to duplicate "${state.section.toUpperCase()}").`, state.lineNumber);
        }
        state.line_should_end = true;
        state.line_should_end_because = `a section name ("${state.section.toUpperCase()}")`;
        state.visitedSections.push(state.section);
        const sectionIndex = sectionNames.indexOf(state.section);

        const name_plus = state.case_sensitive ? state.section : state.section.toUpperCase();
        if (sectionIndex == 0) {
            state.objects_section = 0;
            if (state.visitedSections.length > 1) {
                logError(`section "${name_plus}" must be the first section`, state.lineNumber);
            }
        } else if (state.visitedSections.indexOf(sectionNames[sectionIndex - 1]) == -1) {
            if (sectionIndex===-1) {
                logError(`no such section as "${name_plus}".`, state.lineNumber);
            } else {
                logError(`section "${name_plus}" is out of order, must follow  "${sectionNames[sectionIndex - 1].toUpperCase()}" (or it could be that the section "${sectionNames[sectionIndex - 1].toUpperCase()}"is just missing totally.  You have to include all section headings, even if the section itself is empty).`, state.lineNumber);
            }
        }

        // finalise previous section, based on assumed ordering. Yuck!
        if (state.section === 'objects'){
            state.commentStyle ||= '()';
        } else if (state.section === 'sounds') {
            state.names.push(...Object.keys(state.objects));
            state.names.push(...state.legend_synonyms.map(s => s[0]));
            state.names.push(...state.legend_aggregates.map(s => s[0]));
            state.names.push(...state.legend_properties.map(s => s[0]));
        } else if (state.section === 'levels') {
            state.abbrevNames.push(...Object.keys(state.objects));
            state.abbrevNames.push(...state.legend_synonyms.map(s => s[0]));
            state.abbrevNames.push(...state.legend_aggregates.map(s => s[0]));
        }
        return true;
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse a PRELUDE line, extract parsed information, return array of tokens
    function parsePrelude(stream, state) {
        const lexer = new Lexer(stream, state);
        let value = null;
        
        if (value = getTokens()) 
            setState(state, value);
        return lexer.tokens;

        // extract and validate tokens
        function getTokens() {
            let token = null;
            let kind = 'ERROR';
            let ident = null;
            const args = [];
            if (token = lexer.match(/^[a-z_]+/i, true)) {
                ident = token;
                if (prelude_param_text.includes(token)) {
                    lexer.pushToken(token, 'METADATA');
                    token = lexer.matchAll();
                    lexer.pushToken(token, 'METADATATEXT');
                    args.push(token);
                } else if (prelude_tables.some(t => t.includes(token))) {
                    lexer.pushToken(token, 'METADATA');

                    while (!lexer.checkEol()) {
                        if (token = lexer.match(/^\S+/, true)) {
                            kind = (token in colorPalettes.arnecolors) ? 'COLOR COLOR-' + token.toUpperCase()
                                : (token === "transparent") ? 'COLOR FADECOLOR'
                                : token.match(/^#[0-9a-fA-F]+$/) ? 'MULTICOLOR' + token
                                : 'METADATATEXT';
                            lexer.pushToken(token, kind);
                            args.push(token);
                        } else break;
                    }
                } else lexer.pushBack();
            } 
            if (lexer.checkEol()) {
                return checkArguments(ident, args);
            } else {
                token = lexer.matchNotComment();
                logError(`Unrecognised stuff in the prelude: "${token}".`, state.lineNumber);
                return null;
            }
        }

        function checkArguments(ident, args) {
            if (state.metadata_lines[ident]) {
                var otherline = state.metadata_lines[ident];
                logWarning(`You've already defined a "${ident.toUpperCase()}" in the prelude on line <a onclick="jumpToLine(${otherline})">${otherline}</a>.`, state.lineNumber);
            }
            state.metadata_lines[ident] = state.lineNumber;                                                                                    
            if (prelude_keywords.includes(ident)) {
                if (args.length > 1)
                    logError(`MetaData ${ident.toUpperCase()} doesn't take any parameters, but you went and gave it "${args.join()}".`, state.lineNumber);
                else value = [ident, true];
            } else if (prelude_param_number.includes(ident)) {
                if (args.length != 1 || parseFloat(args[0]) == NaN)
                    logError(`MetaData ${ident.toUpperCase()} requires one numeric argument.`, state.lineNumber);
                else value = [ident, parseFloat(args[0])];
            } else if (prelude_param_single.includes(ident) || prelude_param_text.includes(ident)) {
                if (args.length != 1)
                    logError(`MetaData ${ident.toUpperCase()} requires exactly one argument, but you gave it ${args.length}.`, state.lineNumber);
                else value = [ident, args[0]];
            } else if (prelude_param_multi.includes(ident)) {
                if (args.length < 1)
                    logError(`MetaData ${ident.toUpperCase()} has no arguments, but it needs at least one.`, state.lineNumber);
                else value = [ident, args.join(' ')];
            } else throw 'args';
            return value;
        }

        function setState(state, value) {
            const ident = value[0];
            if (ident == 'sprite_size')
                state.sprite_size = Math.round(value[1]);
            if (ident == 'case_sensitive') {
                state.case_sensitive = true;
                if (Object.keys(state.metadata).some(k => prelude_param_text.includes(k)))
                    logWarningNoLine("Please make sure that CASE_SENSITIVE comes before any case sensitive prelude setting.", false, false);
            }
            if (ident == 'mouse_clicks' && !directions_table.includes(mouse_clicks_table[0])) {
                directions_table.push(...mouse_clicks_table);
                directions_only.push(...mouse_clicks_table);
                soundverbs_movement.push(...mouse_clicks_table);
            }
            if (ident == 'youtube') {
                logWarning("Unfortunately, YouTube support hasn't been working properly for a long time - it was always a hack and it hasn't gotten less hacky over time, so I can no longer pretend to support it.",state.lineNumber);
                return;
            }
            state.metadata.push(...value);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // parse and store an object name, return token token list
    // nameline ::= symbol { symbol | glyph | COPY: symbol | SIZE: number }... 
    function parseObjectName(stream, state, mixedCase) {
        const lexer = new Lexer(stream, state);
        const symbols = {};
        const aliases = [];
        if (getTokens())
            setState();
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            if (state.case_sensitive)
                stream.string = mixedCase;

            while (true) {
                let token = null;
                let kind = 'ERROR';
                if (token = lexer.match(/^copy:/i)) {
                    if (!symbols.candname)
                        logError(`Must define a sprite to copy first`, state.lineNumber);
                    else if (symbols.parent) 
                        logError(`You already assigned a sprite parent for ${symbols.candname}, you can't have more than one!`, state.lineNumber);
                    else kind = 'KEYWORD';
                    lexer.pushToken(token, kind);
                    lexer.checkComment(state);

                    kind = 'ERROR';
                    if (!(token = lexer.matchNameOrGlyph(!state.case_sensitive)))
                        logError(`Missing sprite parent.`, state.lineNumber);
                    else if (token == symbols.candname) 
                        logError(`You attempted to set the sprite parent for ${symbols.candname} to itself! Please don't."`, state.lineNumber)
                    else {
                        kind = 'NAME';
                        symbols.parent = token;
                    }
                    lexer.pushToken(token, kind);
                    if (lexer.checkEolSemi()) break;

                } else if (token = lexer.match(/^size:/i)) {
                    if (!symbols.candname)
                        logError(`Must define a sprite first`, state.lineNumber);
                    else kind = 'KEYWORD';
                    lexer.pushToken(token, kind);
                    lexer.checkComment(state);

                    kind = 'ERROR';
                    token = lexer.match(/^[0-9.]+/);
                    const size = parseFloat(token);
                    if (size == NaN)
                        logError(`Size requires a numeric argument.`, state.lineNumber);
                    else {
                        symbols.size = size;
                        kind = 'METADATATEXT';  //???
                    }
                    lexer.pushToken(token, kind);
                    if (lexer.checkEolSemi()) break;

                    // first name must be an object, glyph allowed after that
                } else if ((token = !symbols.candname ? lexer.matchName(!state.case_sensitive) : lexer.matchNameOrGlyph(!state.case_sensitive))) {
                    if (state.legend_synonyms.some(s => s[0] == token))
                        logError(`Name "${token.toUpperCase()}" already in use.`, state.lineNumber);
                    else if (state.objects[token])
                        logError(`Object "${token.toUpperCase()}" defined multiple times.`, state.lineNumber);
                    else {
                        if (keyword_array.includes(token)) 
                            logWarning(`You named an object "${token.toUpperCase()}", but this is a keyword. Don't do that!`, state.lineNumber);
                        kind = 'NAME';  
                        if (!symbols.candname) symbols.candname = token;
                        else aliases.push(token);
                    }
                    lexer.pushToken(token, kind);
                    if (lexer.checkEolSemi()) break;

                } else if (token = lexer.matchToken()) {
                    logError(`Invalid object name in OBJECT section: "${token}".`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    lexer.matchNotComment();
                    break;
                } else throw 'name';
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function setState() {
            const candname = state.objects_candname = symbols.candname;
            registerOriginalCaseName(state, candname, mixedCase, state.lineNumber);
            state.objects[candname] = {       // doc: array of objects { lineNumber:,colors:,spritematrix } indexed by name
                lineNumber: state.lineNumber,
                colors: [],
                spritematrix: [],
                cloneSprite: symbols.parent || '',
                spriteText: null,
                size: symbols.size
            };
            const cnlc = candname.toLowerCase();
            if (candname != cnlc && [ "background", "player" ].includes(cnlc))
                createAlias(state, cnlc, candname, state.lineNumber);
            for (const alias of aliases) {
                registerOriginalCaseName(state, alias, mixedCase, state.lineNumber);
                createAlias(state, alias, candname, state.lineNumber);
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    function parseObjectColors(stream, state) {
        const lexer = new Lexer(stream, state);
        const colours = [];

        if (getTokens())
            state.objects[state.objects_candname].colors = colours;
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            while (true) {
                let token = null;
                let kind = 'ERROR';
                if (token = lexer.match(/^[#\w]+/, true)) {
                    if (color_names.includes(token) || token.match(/#([0-9a-f]{2}){3,4}|#([0-9a-f]{3,4})/)) {
                        colours.push(token);
                        kind = (token in colorPalettes.arnecolors) ? `COLOR COLOR-${token.toUpperCase()}`
                            : (token === "transparent") ? 'COLOR FADECOLOR'
                            : `MULTICOLOR${token}`;
                    } else logWarning(`Invalid color in object section: "${token}".`, state.lineNumber);
                } else if (token = lexer.matchToken()) {
                    logError(`Was looking for color for object "${state.objects_candname.toUpperCase()}", got "${token}" instead.`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    lexer.matchNotComment();
                } else throw 'color';
                lexer.pushToken(token, kind);

                if (lexer.checkEolSemi()) break;
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }
    }
    
    ////////////////////////////////////////////////////////////////////////////
    // parse sprite grid, one cell at a time (to show them coloured)
    // grid ::= anychar... [ white [ comment ] ]
    // text ::= TEXT: anychar...
    function parseObjectSprite(stream, state) {
        const lexer = new Lexer(stream, state);
        const values = [];
        const obj = state.objects[state.objects_candname];
        
        if (getTokens()) {
            if (values.text)
                obj.spriteText = values.text;
            else obj.spritematrix = (obj.spritematrix || []).concat([values]);
        }
        return lexer.tokens;

        // build a list of tokens and kinds, and extract values
        function getTokens() {
            let token = lexer.match(/^text:/i);
            if (token) {
                lexer.pushToken(token, 'LOGICWORD');

                token = lexer.matchAll();
                lexer.pushToken(token, `COLOR COLOR-${obj.colors[0].toUpperCase()}`);
                values.text = token;
                return true;
            }    

            while (!stream.eol()) {
                let token = lexer.next();
                let kind = 'ERROR';
                let value = -1;
                if (token.match(/\s/)) break; // stop on whitespace, rest is comment or junk
                if (token == '.') kind = 'COLOR FADECOLOR';
                else if (token.match(/[0-9a-zA-Z]/)) {
                    value = token <= '9' ? +token : 10 + token.toLowerCase().charCodeAt(0) - 97;  // letter 'a'
                    if (!obj.colors[value]) 
                        logError(`Trying to access color number ${value + 1} from the color palette of sprite ${state.objects_candname}, but there are only ${obj.colors.length} defined in it."`, state.lineNumber);
                    else kind = 'COLOR BOLDCOLOR COLOR-' + obj.colors[value].toUpperCase();
                } else logError(`Invalid character "${token}" in sprite for ${state.objects_candname}`, state.lineNumber);
                lexer.pushToken(token, kind);
                values.push(value);
            }
            lexer.checkEol();
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }
    }


    ////////////////////////////////////////////////////////////////////////////
    // SOUND DEFINITION:
    // SOUNDEVENT ~ INT (Sound events take precedence if there's name overlap)
    // OBJECT_NAME
    //     NONDIRECTIONAL_VERB ~ INT
    //     DIRECTIONAL_VERB
    //         INT
    //         DIR+ ~ INT
    // parse a SOUNDS line, extract parsed information, return array of tokens
    function parseSoundLine(stream, state) {
        const lexer = new Lexer(stream, state);
        const rows = [];
        const symbols = {};
        
        if (getTokens()) 
            state.sounds.push(...rows);
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token = null;
            let kind = 'ERROR';
            if (token = lexer.match(reg_soundevents, true)) {
                // closemessage 1241234...
                lexer.pushToken(token, 'SOUNDEVENT');
                lexer.checkComment();
                const tevent = token;

                const tsounds = parseSoundSeedsTail();
                if (tsounds) {
                    rows.push(...tsounds.map(s => ['SOUNDEVENT', tevent, s, state.lineNumber]));
                    return true;
                } else {
                    logError("Was expecting a sound seed here (a number like 123123, like you generate by pressing the buttons above the console panel), but found something else.", state.lineNumber);                                
                }
            } else if (token = lexer.matchName(!state.case_sensitive)) {
                // player move [ up... ] 142315...
                if (wordAlreadyDeclared(state, token)) {
                    lexer.pushToken(token, 'NAME');
                    const tobject = token;

                    let tverb = null;
                    if ((token = lexer.match(/^[a-z]+/i, true))) {
                        if (soundverbs_directional.includes(token) || soundverbs_movement.includes(token) || soundverbs_other.includes(token)) {
                            lexer.pushToken(token, 'SOUNDVERB');
                            tverb = token;
                            lexer.checkComment();
                        } else lexer.pushBack();
                    }

                    if (!tverb) {
                        logError("Was expecting a soundverb here (MOVE, DESTROY, CANTMOVE, or the like), but found something else.", state.lineNumber);
                    } else {
                        const tdirs = [];
                        while (token = lexer.match(reg_sounddirectionindicators, true)) {
                            lexer.pushToken(token, 'DIRECTION');
                            tdirs.push(token);
                            lexer.checkComment();
                        }

                        const tsounds = parseSoundSeedsTail();
                        if (tsounds) {
                            rows.push(...tsounds.map(s => ['SOUND', tobject, tverb, tdirs, s, state.lineNumber]));
                            return true;
                        } else if (token == lexer.matchNotComment()) {
                            const dirok = soundverbs_directional.includes(tverb);
                            const msg = dirok ? "direction or sound seed" : "sound seed";
                            logError(`Ah I was expecting a ${msg} after ${tverb}, but I don't know what to make of "${token}".`, state.lineNumber);
                        }
                    }
                } else logError(`unexpected sound token "${token}".`, state.lineNumber);
            } else logWarning("Was expecting a sound event (like SFX3, or ENDLEVEL) or an object name, but didn't find either.", state.lineNumber);

            if (token == lexer.matchNotComment())
                lexer.pushToken(token, 'ERROR');
            return false;
        }
        
        // parse list of at least one sound seeds, check for eol
        function parseSoundSeedsTail() {
            const tsounds = [];
            let token = null;
            while (token = lexer.match(reg_soundseed, true)) {
                lexer.pushToken(token, 'SOUND');
                tsounds.push(token);
                lexer.checkComment();
            }
            if (token = lexer.matchNotComment()) {
                logError(`I wasn't expecting anything after the sound declaration ${peek(tsounds)} on this line, so I don't know what to do with "${token}" here.`, state.lineNumber);
                return null;
            } else return tsounds;
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    function parseLegendLine(stream, state, mixedCase) {
        const lexer = new Lexer(stream, state);
        const names = [];
        const symbols = {};

        if (getTokens())
            setState();
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token
            // start of parse
            if (token = matchNameOrGlyph(stream, !state.case_sensitive)) {
                symbols.newname = token;
                const defname = wordAlreadyDeclared(state, token);
                if (defname)
                    logError(`Name "${token.toUpperCase()}" already in use (on line <a onclick="jumpToLine(${defname.lineNumber});" href="javascript:void(0);"><span class="errorTextLineNumber">line ${defname.lineNumber}</span></a>).`, state.lineNumber);
                else if (keyword_array.includes(token))
                    logWarning(`You named an object "${token.toUpperCase()}", but this is a keyword. Don't do that!`, state.lineNumber);
                lexer.pushToken(token, defname ? 'ERROR' : 'NAME');
            }
            lexer.checkComment(state);

            if (token = lexer.match(/^=/)) {
                lexer.pushToken(token, 'ASSIGNMENT');
            } else {
                logError(`In the legend, define new items using the equals symbol - declarations must look like "A = B", "A = B or C [ or D ...]", "A = B and C [ and D ...]".`, state.lineNumber);
                lexer.matchNotComment();
                // token = lexer.match(reg_notcommentstart);
                // logError(`Equals sign "=" expected, found ${token}`, state.lineNumber);
                // lexer.pushToken(token, 'ERROR');
                return;
            }
            lexer.checkComment(state);

            while (true) {
                if (token = matchNameOrGlyph(stream, !state.case_sensitive)) {
                    const defname = wordAlreadyDeclared(state, token);
                    const ownname = (token == symbols.newname);
                    if (!defname)
                        logError(`You're talking about "${token.toUpperCase()}" but it's not defined anywhere.`, state.lineNumber);
                    else if (ownname)
                        logError(`You can't define object "${token.toUpperCase()}" in terms of itself!`, state.lineNumber);
                    else if (names.includes(token))
                        logWarning(`You're repeating the object "${token.toUpperCase()}" here multiple times on the RHS.  This makes no sense.  Don't do that.`, state.lineNumber);                        
                    names.push(token);
                    lexer.pushToken(token, defname && !ownname ? 'NAME' : 'ERROR');
                } else {
                    lexer.matchNotComment();
                    logError(`Something bad's happening in the LEGEND`, state.lineNumber);
                    //lexer.pushToken(token, 'ERROR');
                    return;
                }

                if (lexer.checkEol(state)) break;

                if (token = lexer.match(/^(and|or)\b/i, true)) {
                    if (!symbols.andor)
                        symbols.andor = token;
                    else if (symbols.andor != token)
                        logError(`Cannot mix AND and OR`, state.lineNumber);
                        lexer.pushToken(token, token == symbols.andor ? 'LOGICWORD' : 'ERROR' );
                } else {
                    token = lexer.match(reg_notcommentstart);
                    logError(`AND or OR expected, found ${token}`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    return;
                }
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function setState() {
            if (names.length == 1) {
                registerOriginalCaseName(state, symbols.newname, mixedCase, state.lineNumber);  // tofix:
                createAlias(state, symbols.newname, names[0], state.lineNumber);
            } else if (symbols.andor == 'and') {
                const newlegend = [ symbols.newname, ...names
                    .flatMap(n => expandSymbol(state, n, true, 
                        () => logError("Cannot define an aggregate (using 'and') in terms of properties (something that uses 'or').", state.lineNumber))) ];
                newlegend.lineNumber = state.lineNumber;
                registerOriginalCaseName(state, symbols.newname, mixedCase, state.lineNumber);
                state.legend_aggregates.push(newlegend);
            } else { // == 'or'
                const newlegend = [ symbols.newname, ...names
                    .flatMap(n => expandSymbol(state, n, false,
                        () => logError("Cannot define a property (something defined in terms of 'or') in terms of aggregates (something that uses 'and').", state.lineNumber))) ];
                newlegend.lineNumber = state.lineNumber;
                registerOriginalCaseName(state, symbols.newname, mixedCase, state.lineNumber);
                state.legend_properties.push(newlegend);
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    function parseCollisionLayer(stream, state) {
        const lexer = new Lexer(stream, state);
        const idents = [];

        if (getTokens())
            setState();
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token = null;
            // start of parse
            while (true) {
                if (token = matchNameOrGlyph(stream, !state.case_sensitive)) {
                    let kind = 'ERROR';
                    if (!wordAlreadyDeclared(state, token))
                        logError(`Cannot add "${token.toUpperCase()}" to a collision layer; it has not been declared.`, state.lineNumber);
                    else if (token == 'background' && idents.length != 0)
                        logError("Background must be in a layer by itself.",state.lineNumber);
                    else {
                        if (idents.includes(token))
                            logWarning(`Object "${token.toUpperCase()}" included explicitly multiple times in the same layer. Don't do that innit.`,state.lineNumber);         
                        else idents.push(token);
                        kind = 'NAME';
                    }
                    lexer.pushToken(token, kind);
                } else {
                    token = lexer.match(reg_notcommentstart);
                    logError(`Object name expected, found ${token}`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    return;
                }

                if (lexer.checkEol(state)) break;

                // treat the comma as optional (as PS seems to do). Trailing comma is OK too
                if (token = lexer.match(/^,/)) {
                    lexer.pushToken(token, 'LOGICWORD');
                    if (lexer.checkEol(state)) break;
                } 
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function setState() {
            const allobjs = [];
            for (const ident of idents) {
                const objs = expandSymbol(state, ident, false, n => logError(
                    `"${n}" is an aggregate (defined using "and"), and cannot be added to a single layer because its constituent objects must be able to coexist.`, state.lineNumber));
                allobjs.push(...objs);     // do we care about possible in-layer duplicates?

                const dups = new Set();
                state.collisionLayers.forEach((layer, layerno) => {
                    for (const obj of objs) {
                        if (layer.includes(obj))
                            dups.add(layerno + 1);
                    }
                });
                if (dups.size != 0) {
                    const joins = [...dups].map(v => `#${v}, `) + `#${state.collisionLayers.length + 1}`;
                    logWarning(`Object "${ident.toUpperCase()}" included in multiple collision layers ( layers ${joins} ). You should fix this!`, state.lineNumber);
                }
            }

            state.collisionLayers.push(allobjs);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    //  [ ALL | ANY | NO | SOME ] <object> [ ON <object> ]?
    //
    function parseWinCondition(stream, state) {
        const lexer = new Lexer(stream, state);
        const names = [];
        const symbols = {};

        if (getTokens())
            setState();
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token
            // start of parse
            if (token = lexer.match(/^(all|any|no|some)\b/i, true)) {
                symbols.start = token;
                lexer.pushToken(token, 'LOGICWORD');
            } else {
                token = lexer.match(reg_notcommentstart);
                logError(`Expecting the start of a win condition ("ALL","SOME","NO") but got "${token.toUpperCase()}".`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }

            lexer.checkComment(state);
            getIdent();
            if (!lexer.checkEol(state)) {
                if (token = lexer.match(/^(on)\b/u, true)) {
                    symbols.kind = token;
                    lexer.pushToken(token, 'LOGICWORD');
                } else {
                    token = lexer.matchNotComment();
                    logError(`Expecting the word "ON" but got "${token.toUpperCase()}".`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                    return;
                }

                lexer.checkComment(state);
                getIdent();
                if (!lexer.checkEol(state)) {
                    token = lexer.matchNotComment();
                    logError(`Error in win condition: I don't know what to do with "${token.toUpperCase()}".`, state.lineNumber);
                    lexer.pushToken(token, 'ERROR');
                }
            }
            return !lexer.tokens.some(t => t.kind == 'ERROR');
        }

        function getIdent() {
            let token
            if (token = matchNameOrGlyph(stream, !state.case_sensitive)) {
                let kind = 'ERROR';
                if (!wordAlreadyDeclared(state, token))
                    logError(`Error in win condition: "${token.toUpperCase()}" is not a valid object name.`, state.lineNumber);
                else {
                    names.push(token);
                    kind = 'NAME';
                }
                lexer.pushToken(token, kind);
            } else {
                token = lexer.matchNotComment();
                logError(`Object name expected, found ${token}`, state.lineNumber);
                lexer.pushToken(token, 'ERROR');
                return;
            }
        }

        function setState() {
            state.winconditions.push((names.length == 1) 
                ? [ symbols.start, names[0], state.lineNumber ]
                : [ symbols.start, names[0], 'on', names[1], state.lineNumber ]);
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    //  line ::= MESSAGE <text>
    //         | SECTION <text>
    //         | GOTO <text>
    //         | ( <levelchar>+ [ WS comment ] )+
    function parseLevel(stream, state) {
        const lexer = new Lexer(stream, state);
        const names = [];
        const symbols = {};

        if (getTokens())
            setState();
        return lexer.tokens;

        // build a list of tokens and kinds
        function getTokens() {
            let token
            // start of parse
            if (token = lexer.match(/^(message|section|goto)/i, true)) { // allow omision of whitespace (with no warning!)
                symbols.start = token;
                lexer.pushToken(token, `${token.toUpperCase()}_VERB`);
                symbols.text = lexer.matchAll();
                if (symbols.text.length > 0)
                    lexer.pushToken(symbols.text, `METADATATEXT`);  // empty causes havoc
            } else {
                symbols.gridline = '';
                while (token = lexer.match(/^\S/, !state.case_sensitive)) {
                    symbols.gridline += token;
                    const kind = state.abbrevNames.includes(token) ? 'LEVEL' : 'ERROR';
                    if (kind == 'ERROR')
                        logError(`Key "${token.toUpperCase()}" not found. Do you need to add it to the legend, or define a new object?`, state.lineNumber);
                    lexer.pushToken(token, kind);                        
                }
            }

            lexer.checkEol(state);
            return true;
        }

        function setState() {
            if (symbols.start == 'section')
                state.currentSection = symbols.text;
            else {
                // look for marker level that says a blank line has been seen
                let toplevel = peek(state.levels);
                if (toplevel && toplevel.length == 0) {
                    state.levels.pop();
                    toplevel = null;
                }
                if (symbols.start == 'message')
                    state.levels.push([ '\n', symbols.text, state.lineNumber, state.currentSection ]);
                else if (symbols.start == 'goto')
                    state.levels.push([ 'goto', symbols.text, state.lineNumber, state.currentSection ]);
                else {
                    if (toplevel == null || [ '\n', 'goto' ].includes(toplevel[0]))
                        state.levels.push([ state.lineNumber, state.currentSection, symbols.gridline ]);
                    else {
                        if (symbols.gridline.length != toplevel[2].length)
                            logWarning("Maps must be rectangular, yo (In a level, the length of each row must be the same).", state.lineNumber);
                        toplevel.push(symbols.gridline);
                    }
                }
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // because of all the early-outs in the token function, this is really just right now attached
    // too places where we can early out during the legend. To make it more versatile we'd have to change 
    // all the early-outs in the token function to flag-assignment for returning outside the case 
    // statement.
    function endOfLineProcessing(state, mixedCase){
        // if (state.section==='legend'){
        //     processLegendLine(state,mixedCase);
        // } else if (state.section ==='sounds'){
        //     processSoundsLine(state);
        //}
    }

    ////////////////////////////////////////////////////////////////////////////
    // called as per CodeMirror API
    // return value is an object containing a specific set of named functions
    return {
        copyState: function(state) {
            // clone one layer down
            const newObjects = {};
            for (const [key,obj] of Object.entries(state.objects)) {
                newObjects[key] = {
                    colors: obj.colors.slice(),
                    lineNumber : obj.lineNumber,
                    spritematrix: obj.spritematrix.slice(),
                    spriteText: obj.spriteText
                    // bug: why no copy of cloneSprite?
                };
            }

            return ({
                original_case_names: Object.assign({}, state.original_case_names),
                original_line_numbers: Object.assign({}, state.original_line_numbers),
                lineNumber: state.lineNumber,

                objects: newObjects,
                collisionLayers: state.collisionLayers.map(p => p.slice()),

                commentLevel: state.commentLevel,
                commentStyle: state.commentStyle,
                section: state.section,
                visitedSections: state.visitedSections.slice(),

                line_should_end: state.line_should_end,
                line_should_end_because: state.line_should_end_because,
                sol_after_comment: state.sol_after_comment,

                objects_candname: state.objects_candname,
                objects_section: state.objects_section,
                objects_spritematrix: state.objects_spritematrix.slice(),

                tokenIndex: state.tokenIndex,
                // PS+ SECTION command argument if any
                currentSection: state.currentSection,
                current_line_wip_array: state.current_line_wip_array.slice(),

                legend_synonyms: state.legend_synonyms.map(p => p.slice()),
                legend_aggregates: state.legend_aggregates.map(p => p.slice()),
                legend_properties: state.legend_properties.map(p => p.slice()),

                sounds: state.sounds.map(p => p.slice()),

                rules: state.rules.map(p => p.slice()),

                names: state.names.slice(),

                winconditions: state.winconditions.slice(),

                original_case_names : Object.assign({},state.original_case_names),
                original_line_numbers : Object.assign({},state.original_line_numbers),
    
                abbrevNames: state.abbrevNames.slice(),

                metadata : state.metadata.slice(),
                metadata_lines: Object.assign({}, state.metadata_lines),

                sprite_size : state.sprite_size,

                case_sensitive : state.case_sensitive,

                levels: state.levels.map(p => p.slice()),

                STRIDE_OBJ : state.STRIDE_OBJ,
                STRIDE_MOV : state.STRIDE_MOV
            });
        },
        blankLine: function(state) {
            blankLineHandle(state);
        },
        // function is called to successively find tokens and return a token type in a source code line
        // note: there is no end of line marker, the next line will follow immediately
        token: function(stream, state) {
            // these sections may have pre-loaded tokens, to be cleared before *anything* else
            if (state.current_line_wip_array.length > 0 
                && ['', 'prelude', 'objects', 'sounds', 'legend', 'collisionlayers', 'winconditions', 'levels'].includes(state.section))
                return flushToken();

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

            if (state.tokenIndex !== -4 && matchComment(stream, state) != null) {
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
            if (sol && stream.match(reg_equalsrow, true)) {  // todo: not if we're in a level
                state.line_should_end = true;
                state.line_should_end_because = 'a bunch of equals signs (\'===\')';
                return 'EQUALSBIT';
            }

            if (sol && parseSection(stream, state))
                return 'HEADER';

            if (stream.eol()) {
                //endOfLineProcessing(state,mixedCase);  
                return null;
            }

            // per section specific parsing
            switch (state.section) {
                case '': {
                    if (sol) {
                        stream.string = mixedCase;  // put it back, for now!
                        state.current_line_wip_array = parsePrelude(stream, state);
                    }
                    return flushToken();

                }
                case 'objects': {
                    if (state.objects_section == 0) {
                        state.current_line_wip_array = [];
                        state.objects_section = 1;
                    } else if (state.objects_section == 3) {
                        // if not a grid char assume missing blank line and go to next object
                        if (sol && !stream.match(/^[.\d]/, false) && state.objects_candname
                            && state.objects[state.objects_candname].colors.length <= 10 && !stream.match(/^[\w]+:/, false)) {
                            //if (debugLevel) console.log(`${state.lineNumber}: Object ${state.objects_candname}: ${JSON.stringify(state.objects[state.objects_candname])}`)
                            state.objects_section = 1;
                        }
                    }

                    if (sol)
                        state.current_line_wip_array['mixed'] = mixedCase;
                    else mixedCase = state.current_line_wip_array['mixed'];

                    //console.log(`objects_section ${state.objects_section} at ${state.lineNumber}: ${mixedCase}`);
                    switch (state.objects_section) {
                    case 1: { 
                            state.current_line_wip_array.push(...parseObjectName(stream, state, mixedCase));
                            state.objects_section++;
                            return flushToken();
                        }
                    case 2: { 
                            state.current_line_wip_array.push(...parseObjectColors(stream, state));
                            state.objects_section++;
                            return flushToken();
                        }
                    case 3: {
                            stream.string = mixedCase;
                            state.current_line_wip_array.push(...parseObjectSprite(stream, state));
                            return flushToken();
                        }
                    }
                    break;
                }

                case 'legend': {
                    state.current_line_wip_array = parseLegendLine(stream, state, mixedCase);
                    return flushToken();
                }

                case 'sounds': {
                    stream.string = mixedCase;
                    state.current_line_wip_array = parseSoundLine(stream, state);
                    return flushToken();
                }

                case 'collisionlayers': {
                    state.current_line_wip_array = parseCollisionLayer(stream, state);
                    return flushToken();
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
                            } else if (state.tokenIndex === 1 && directions_table.includes(m)) {
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
                                    if (commandargs_table.includes(m) || twiddleable_params.includes(m)) {
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
                    state.current_line_wip_array = parseWinCondition(stream, state);
                    return flushToken();
                }
                case 'levels': {
                    stream.string = mixedCase;
                    state.current_line_wip_array = parseLevel(stream, state);
                    return flushToken();
                }
                        
                default: { 
                    throw 'case!';
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

            // flush token and kind list back to caller
            function flushToken() {
                if (state.current_line_wip_array.length > 0) {
                    const token = state.current_line_wip_array.shift();
                    stream.pos = token.pos;
                    return token.kind;
                } else return null;
            }

        },
        startState: function() {
            return {
                objects: {},

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

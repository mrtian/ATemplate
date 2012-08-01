 var  cache = {},
     _helpers = {},
     _plugins={},
     _isNewEngine = ''.trim;

    /**
    * 前后标志符
    */
    exports.openTag = '<%';
    exports.closeTag = '%>';

    // *
    //  * 渲染模板
    //  * @name    template.render
    //  * @param   {String}    模板ID
    //  * @param   {Object}    数据
    //  * @return  {String}    渲染好的HTML字符串
     
    exports.render = function (id, data) {

        var cache = _getCache(id);
        
        if (cache === undefined) {

            return _debug({
                id: id,
                name: 'Render Error',
                message: 'Not Cache'
            });
            
        }
        
        return cache(data); 
    };



    /**
     * 编译模板
     * @name    template.compile
     * @param   {String}    模板ID (可选)
     * @param   {String}    模板字符串
     * @return  {Function}  渲染方法
     */
    exports.compile = function (id, source) {
        
        var debug = arguments[2];
        
        
        if (typeof source !== 'string') {
            debug = source;
            source = id;
            id = null;
        }  

        
        try {
            
            var cache = _compile(source, debug);
            
        } catch (e) {
        
            e.id = id || source;
            e.name = 'Syntax Error';
            return _debug(e);
            
        }
        
        
        function render (data) {           
            
            try {
                
                return cache.call(_helpers,data); 
                
            } catch (e) {
                
                if (!debug) {
                    return exports.compile(id, source, true)(data);
                }

                e.id = id || source;
                e.name = 'Render Error';
                e.source = source;
                
                return _debug(e);
                
            };
            
        };
        
        
        render.toString = function () {
            return cache.toString();
        };
        
        
        if (id) {
            _cache[id] = render;
        }


       
        return render;

    };




    /**
     * 扩展模板辅助方法
     * @name    template.helper
     * @param   {String}    名称
     * @param   {Function}  方法
     */
    exports.helper = function (name, helper) {
        if (helper === undefined) {
            return _helpers[name];
        } else {
            _helpers[name] = helper;
        }
    };

    /**
     * 扩展模板插件方法
     * @name    template.helper
     * @param   {String}    名称
     * @param   {Function}  方法
     */
    exports.plugin = function (name, plugin) {
        if (plugin === undefined) {
            return _plugins[name];
        } else {
           _plugins[name] = plugin;
        }
    };




    // 模板编译器
    var _compile = function (source, debug) {

        var openTag = exports.openTag;
        var closeTag = exports.closeTag;
        var parser = exports.parser;

        
        var code = source;
        var tempCode = '';
        var line = 1;
        var outKey = {};
        var uniq = {$out:true,$line:true};
        
        var variables = "var $helpers=this,"
        + (debug ? "$line=0," : "");
        
        var replaces = _isNewEngine
        ? ["$out='';", "$out+=", ";", "$out"]
        : ["$out=[];", "$out.push(", ");", "$out.join('')"];
        
        var include = "function(id,data){"
        +     "if(data===undefined){data=$data}"
        +     "return $helpers.$render(id,data)"
        + "}";
        
        
        
        // html与逻辑语法分离
        _forEach.call(code.split(openTag), function (code, i) {
            code = code.split(closeTag);
            
            var $0 = code[0];
            var $1 = code[1];
            
            // code: [html]
            if (code.length === 1) {
                
                tempCode += html($0);
             
            // code: [logic, html]
            } else {
                
                tempCode += logic($0);
                
                if ($1) {
                    tempCode += html($1);
                }
            }
            

        });
        
        
        
        code = tempCode;
        
        
        // 调试语句
        if (debug) {
            code = 'try{' + code + '}catch(e){'
            +       'e.line=$line;'
            +       'throw e'
            + '}';
        }
        
        
        code = variables + replaces[0] + code + 'return ' + replaces[3];
        
        
        try {

            return new Function('$data', code);
            
        } catch (e) {
            e.temp = 'function anonymous($data) {' + code + '}';
            throw e;
        };
        
        
        
        // 处理 HTML 语句
        function html (code) {
            
            // 记录行号
            line += code.split(/\n/).length - 1;
            
            code = code
            // 单双引号与反斜杠转义
            .replace(/('|"|\\)/g, '\\$1')
            // 换行符转义(windows + linux)
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n');
            
            code = replaces[1] + "'" + code + "'" + replaces[2];
            
            return code + '\n';
        };
        
        
        // 处理逻辑语句
        function logic (code) {

            var thisLine = line;
           
            if (parser) {
            
                 // 语法转换器
                code = parser(code);
                
            } else if (debug) {
            
                // 记录行号
                code = code.replace(/\n/g, function () {
                    line ++;
                    return '$line=' + line +  ';';
                });
                
            }
            
            // 输出语句
            if (code.indexOf('=') === 0) {

                //添加插件方法
                /** 
                * add by littlefox.tian@gmail.com
                */
                var _scode = code.substring(1).replace(/[\s;]*$/, ''),
                vars,_plugin,
                trueCode,
                plugingFlag = _scode.split('|');

                if(plugingFlag.length>1){

                    _scode = plugingFlag[0];
                    _plugin = plugingFlag[1].split(":");

                    fn = _plugin[0];

                    vars = _plugin.slice(1);

                    vars.unshift(_scode);
                    vars.unshift('"'+fn+'"');

                    trueCode = '$plugins('+vars.join(',')+')';

                }else{
                    trueCode = _scode;
                }
                
                code = replaces[1]
                + (_isNewEngine ? '$getValue(' : '')
                + trueCode
                + (_isNewEngine ? ')' : '')
                + replaces[2];

            }


            if (debug) {
                code = '$line=' + thisLine + ';' + code;
            }

            getKey(code);
            
            return code + '\n';
        };
        
        
        // 提取模板中的变量名
        function getKey (code) {
            
            // 过滤注释、字符串、方法名
            code = code.replace(/\/\*.*?\*\/|'[^']*'|"[^"]*"|\.[\$\w]+/g, '');

            // 分词
            _forEach.call(code.split(/[^\$\w\d]+/), function (name) {
             
                // 沙箱强制语法规范：禁止通过套嵌函数的 this 关键字获取全局权限
                if (/^(this|\$helpers)$/.test(name)) {
                    throw {
                        message: 'Prohibit the use of the "' + name +'"'
                    };
                }

                // 过滤关键字与数字
                if (!name || _keyWordsMap[name] || /^\d/.test(name)) {
                    return;
                }
                
                // 除重
                if (!uniq[name]) {
                    setValue(name);
                    uniq[name] = true;
                }
                
            });
            
        };
        
        
        // 声明模板变量
        // 赋值优先级: 内置特权方法(include) > 公用模板方法 > 数据
        function setValue (name) {  
            var value;

            if (name === 'include') {
            
                value = include;
                
            } else if (_helpers[name]) {
                
                value = '$helpers.' + name;
                
            } else {
            
                value = '$data.' + name;

            }
            
            variables += name + '=' + value + ',';
        };
        

    };



    // 获取模板缓存
    var _getCache = function (id) {
        var cache = _cache[id];
        
        if (cache === undefined ) {
            var elem = document.getElementById(id);
            
            if (elem) {
                exports.compile(id, elem.value || elem.innerHTML);
            }
            
            return _cache[id];
        }
        
        return cache;
    };



    // 模板调试器
    var _debug = function (e) {

        var content = '[template]:\n'
            + e.id
            + '\n\n[name]:\n'
            + e.name;
        
        if (e.message) {
            content += '\n\n[message]:\n'
            + e.message;
        }
        
        if (e.line) {
            content += '\n\n[line]:\n'
            + e.line;
            content += '\n\n[source]:\n'
            + e.source.split(/\n/)[e.line - 1].replace(/^[\s\t]+/, '');
        }
        
        if (e.temp) {
            content += '\n\n[temp]:\n'
            + e.temp;
        }
        
        if (window.console) {
            console.error(content);
        }
        
        function error () {
            return error + '';
        };
        
        error.toString = function () {
            return '{Template Error}';
        };
        
        return error;
    };


    // 数组迭代方法
    var _forEach =  Array.prototype.forEach || function (block, thisObject) {
        var len = this.length >>> 0;
        
        for (var i = 0; i < len; i++) {
            if (i in this) {
                block.call(thisObject, this[i], i, this);
            }
        }
        
    };



    // javascript 关键字表
    var _keyWordsMap = {};
    _forEach.call((

        // 关键字
        'break,case,catch,continue,debugger,default,delete,do,else,false,finally,for,function,if'
        + ',in,instanceof,new,null,return,switch,this,throw,true,try,typeof,var,void,while,with'
        
        // 保留字
        + ',abstract,boolean,byte,char,class,const,double,enum,export,extends,final,float,goto'
        + ',implements,import,int,interface,long,native,package,private,protected,public,short'
        + ',static,super,synchronized,throws,transient,volatile'
        
        // ECMA 5 - use strict
        + ',arguments,let,yield'
        
    ).split(','), function (key) {
        _keyWordsMap[key] = true;
    });



    // 模板私有辅助方法
    exports.helper('$forEach', _forEach);
    exports.helper('$render', exports.render);
    exports.helper('$getValue', function (value) {
        return value === undefined ? '' : value;
    });
    //插件私有方法
    exports.helper('$plugins',function(){
        var args = Array.prototype.slice.call(arguments,0),
            name = args[0];

        if(_plugins[name]){
         return _plugins[name].apply(this,args.slice(1));
        }
    })


    exports.plugin('truncate',function(str,num,buf){
        buf = buf||'...';
        if(str.length>num){
            return str.substring(0,num)+buf;
        }else{
            return str;
        }
    });


    //encode plugin
    var htmlDecodeDict = { "quot": '"', "lt": "<", "gt": ">", "amp": "&", "nbsp": " " };
    var htmlEncodeDict = { '"': "quot", "<": "lt", ">": "gt", "&": "amp", " ": "nbsp" };

    exports.plugin('encode',function(str,type){
        //html encode
        if(type === 'html'){
            return String(str).replace(/["<>& ]/g, function(all) {
                    return "&" + htmlEncodeDict[all] + ";";
                });
        }else if(type === 'url'){
            return encodeURIComponent(String(str));
        }else{
            return str;
        }


    });

    exports.plugin('decode',function(str,type){
        if(type==='html'){
            return String(str).replace(/["<>& ]/g, function(all) {
                    return "&" + htmlEncodeDict[all] + ";";
                });
        }else if(type==='url'){
            return decodeURIComponent(String(str));
        }else{
            return str;
        }
    });

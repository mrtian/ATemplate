#核心代码主要来源于artTemplete的实现  
#增加了支持模板插件的方法  
#使用:
Javascript:

var templete = require('templte');

exports.plugin('truncate',function(str,num,buf){  
    buf = buf||'...';  
    if(str.length>num){  
        return str.substring(0,num)+buf;  
    }else{  
        return str;  
    }  
});  

HTML:  

<%=title|truncate:15%>  

Enjoy it.  
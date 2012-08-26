##模板核心代码主要来源于artTemplete的实现  
##增加了支持模板插件的方法  
####使用:
Javascript:

var templete = require('templte');

templete.plugin('truncate',function(str,num,buf){  
    buf = buf||'...';  
    if(str.length>num){  
        return str.substring(0,num)+buf;  
    }else{  
        return str;  
    }  
}); 

templete.plugin('encode',function(str,type){
//do encode
}); 

HTML: 
<%=title|truncate:15%>  
<%=title|encode:"js"%>

Enjoy it.  

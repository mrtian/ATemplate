##模板核心代码主要来源于artTemplete的实现  
##增加了支持模板插件的方法  
####使用:  
Javascript:   

var templete = require('templte');

####增加一个模板插件方法
```
//截字
templete.plugin('truncate',function(str,num,buf){   
    buf = buf||'...';   
    if(str.length>num){   
        return str.substring(0,num)+buf;   
    }else{  
        return str;  
    }   
});  
//encode
templete.plugin('encode',function(str,type){
//do encode
}); 
```

####在模板中使用插件
#####如果您使用过smarty，这里的使用跟smarty中是一样的
HTML:
``` 
<%=title|truncate:15|encode:"html"%>    
<%=title|encode:"js"%>  
```
#####template.js中已经提供了常用的几种插件：truncate,decode,encode,replace,default，您可以按自己的需求重写或者删除

####Enjoy it.  

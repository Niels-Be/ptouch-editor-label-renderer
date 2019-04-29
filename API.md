<a name="PTouchRenderer"></a>

## PTouchRenderer
**Kind**: global class  

* [PTouchRenderer](#PTouchRenderer)
    * [new PTouchRenderer(canvas)](#new_PTouchRenderer_new)
    * [.open(lbxFile)](#PTouchRenderer+open)
    * [.render()](#PTouchRenderer+render)
    * [.getFields()](#PTouchRenderer+getFields)
    * [.setFieldOverwrites(fieldOverwrites)](#PTouchRenderer+setFieldOverwrites)
    * [.getPaper()](#PTouchRenderer+getPaper)
    * [.getPaperName()](#PTouchRenderer+getPaperName)

<a name="new_PTouchRenderer_new"></a>

### new PTouchRenderer(canvas)

| Param | Type |
| --- | --- |
| canvas | <code>HTMLCanvasElement</code> | 

<a name="PTouchRenderer+open"></a>

### pTouchRenderer.open(lbxFile)
Opens a ptouch editor lbx file

**Kind**: instance method of [<code>PTouchRenderer</code>](#PTouchRenderer)  

| Param | Type |
| --- | --- |
| lbxFile | <code>JSZip</code> \| <code>File</code> | 

<a name="PTouchRenderer+render"></a>

### pTouchRenderer.render()
Render the lable into the canvas

**Kind**: instance method of [<code>PTouchRenderer</code>](#PTouchRenderer)  
<a name="PTouchRenderer+getFields"></a>

### pTouchRenderer.getFields()
Get fields parsed from lable

**Kind**: instance method of [<code>PTouchRenderer</code>](#PTouchRenderer)  
<a name="PTouchRenderer+setFieldOverwrites"></a>

### pTouchRenderer.setFieldOverwrites(fieldOverwrites)
Overwrite field values in the lable
You need to call render() afterwards to make changes visible

**Kind**: instance method of [<code>PTouchRenderer</code>](#PTouchRenderer)  

| Param | Type |
| --- | --- |
| fieldOverwrites | <code>object</code> | 

<a name="PTouchRenderer+getPaper"></a>

### pTouchRenderer.getPaper()
Get paper settings

**Kind**: instance method of [<code>PTouchRenderer</code>](#PTouchRenderer)  
<a name="PTouchRenderer+getPaperName"></a>

### pTouchRenderer.getPaperName()
Get paper type matching brother_ql names

**Kind**: instance method of [<code>PTouchRenderer</code>](#PTouchRenderer)  

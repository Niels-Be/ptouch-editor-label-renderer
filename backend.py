import brother_ql
import brother_ql.backends.helpers
from bottle import get, post, run, static_file, template, request, response
import click
from base64 import b64decode
from PIL import Image
from io import BytesIO

LABEL_API_HOST = "0.0.0.0"
LABEL_API_PORT = 8765

BROTHER_QL_MODEL = "QL-800"
BROTHER_QL_BACKEND = None
BROTHER_QL_PRINTER = "file:///dev/usb/lp0"

DEBUG = False

IS_PRINTING = False

@get('/')
def getIndex():
    return static_file("index.html", root='./public')

@get('/static/<filename:path>')
def getStatic(filename):
    return static_file(filename, root='./public')

@post('/api/print')
def postPrintImage():
    global IS_PRINTING
    try:
        body = request.json
        if not "image" in body:
            return {'success': False, 'error': "image is required"}
        if IS_PRINTING:
            return {'success': False, 'error': "Printer is busy"}

        IS_PRINTING = True
        rawImageData = b64decode(body["image"])
        rawImage = Image.open(BytesIO(rawImageData))

        # convert image
        qlr = brother_ql.raster.BrotherQLRaster(BROTHER_QL_MODEL)
        brother_ql.conversion.convert(qlr, [rawImage], **body)

        # print it
        kwargs = {
            'printer_identifier': BROTHER_QL_PRINTER,
            'backend_identifier': BROTHER_QL_BACKEND,
            'blocking': True,
        }
        result = brother_ql.backends.helpers.send(qlr.data, **kwargs)
        success = result['did_print'] and result['ready_for_next_job']
        return {'success': success, 'result': result}
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        IS_PRINTING = False



def run_server():
    run(host=LABEL_API_HOST, port=LABEL_API_PORT)



@click.command()
@click.option('--host', default=LABEL_API_HOST, help='Host / IP to listen on')
@click.option('--port', default=LABEL_API_PORT, help='Port to listen on')
@click.option('--model', default=BROTHER_QL_MODEL , help='brother_ql model')
@click.option('--backend', default=BROTHER_QL_BACKEND, help='brother_ql backend')
@click.option('--printer', default=BROTHER_QL_PRINTER, help='brother_ql printer')
@click.option('--debug', is_flag=True, help='Enable verbose debugging output')
def cli(host, port, model, backend, printer, debug):
    """
    Start the label_api software
    """
    global LABEL_API_HOST, LABEL_API_PORT
    global BROTHER_QL_MODEL, BROTHER_QL_BACKEND, BROTHER_QL_PRINTER
    global DEBUG
    LABEL_API_HOST = host
    LABEL_API_PORT = port
    BROTHER_QL_MODEL = model
    BROTHER_QL_BACKEND = backend
    BROTHER_QL_PRINTER = printer
    DEBUG = debug
    run_server()

if __name__ == '__main__':
    cli()
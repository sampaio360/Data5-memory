from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({'message': 'Bem-vindo à API Flask!'})

@app.route('/status')
def status():
    return jsonify({'status': 'OK', 'service': 'Flask Web Server'})

@app.route('/health')
def health():
    return jsonify({'health': 'healthy', 'uptime': 'running'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
from flask import Flask, render_template, request, jsonify
import time
import pandas as pd
import os

app = Flask(__name__)

# Configure static and template folders
app.static_folder = 'static'
app.template_folder = 'templates'

# lists that stores current temperature and humidity
data = pd.DataFrame(columns=['timestamp', 'temperature', 'humidity'])

# Variable that stores the last time the reset_server 
last_pwr_trigger = 0
last_ping = 0
max_history = 15000
wait_time = 1
credentials = "damnimgoingtovietnam"
pc_status = False
last_motion_detected = 0
class RateLimitError(Exception):
    pass

@app.route('/')
def index():
    "Shows the main page"
    return render_template('index.html')

@app.route('/api/put_reset', methods=['PUT']) # Put
def update_reset():
    '''
    Updates the last reset time to now, needs to attach the correct credentials
    Used by the web interface
    '''
    global last_pwr_trigger
    
    try:
        json_data = request.get_json()
        if not json_data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        if json_data.get("credentials") != credentials:
            return jsonify({
                'status': 'error',
                'message': 'Invalid credentials'
            }), 401
        
        last_pwr_trigger = int(time.time())
        return jsonify({
            'status': 'success',
            'message': 'Power trigger updated',
            'last_pwr_trigger': last_pwr_trigger,
            'readable_time': time.ctime(last_pwr_trigger)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/get_data',  methods=['GET']) # Get
def get_data():
    '''
    Returns the full data in json format
    Used by the web interface
    '''
    global data, last_ping
    return jsonify({
        'status': 'success',
        'data': data.to_dict('records'),
        'total_records': len(data),
        'last_pwr_trigger': last_pwr_trigger,
        'text_last_pwr_trigger': time.ctime(last_pwr_trigger) if last_pwr_trigger != 0 else "Never",
        'last_ping': last_ping,
        'text_last_ping': time.ctime(last_ping) if last_ping != 0 else "Never",
        'ping_delta': int(time.time()) - last_ping if last_ping != 0 else "Never",
        'reset_delta': int(time.time()) - last_pwr_trigger if last_pwr_trigger != 0 else "Never",
        'pc_status': pc_status,
        'last_motion_detected': last_motion_detected
    })

@app.route('/api/update_status', methods=["POST"]) # Post
def update_status():
    '''
    Takes the json data sent in and add it to the temperature/humidity data
    Truncate both temperature and humidity to 150 data points.
    If last call was less than wait_time seconds ago, throw error too fast
    Used by the ESP8266
    '''
    global last_pwr_trigger, last_ping, data
    curr_time = int(time.time())
    if curr_time - last_ping < wait_time:
        raise RateLimitError(f"Too fast, last API call was {curr_time - last_ping} second(s) ago. Wait {wait_time} second(s)")

    try:
        json_data = request.get_json()
        if not json_data:
            raise ValueError("Could not get valid data")
        
        if json_data.get("credentials") != credentials:
            raise ValueError("Wrong credentials.")
        
        new_row = {
            'timestamp': int(time.time()),
            'temperature': json_data.get('temperature'),
            'humidity': json_data.get('humidity')
        }

        data = pd.concat([data, pd.DataFrame([new_row])], ignore_index=True)

        if len(data) > max_history:
            data = data.tail(max_history-200).reset_index(drop=True)
        
        last_ping = curr_time

        return jsonify({
            'status': 'success',
            'last_pwr_trigger': last_pwr_trigger,
            'message': 'Data updated successfully'
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500



if __name__ == '__main__':  
    app.run(debug=True, host='0.0.0.0', port=5000)

    
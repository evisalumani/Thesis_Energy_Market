from flask import Flask, jsonify, json, request, Response
# import os
# import socket
from optimization import EnergyOptimization

app = Flask(__name__)

@app.route("/")
def hello():
    return jsonify({"message": "Optimization API"});

@app.route('/optimalEnergyDecomposition', methods = ['POST'])
def optimalEnergyDecomposition():
    request_json = request.json;
    opt_problem = EnergyOptimization(
            nr_sellers = request_json["nr_sellers"], 
            buyer_demand = request_json["buyer_demand"], 
            sellers_price = request_json["sellers_price"], 
            sellers_capacity = request_json["sellers_capacity"], 
            used_capacities = request_json["used_capacities"],
            hop_distrances_from_buyer = request_json["hop_distrances"]);
    try:
        solution = opt_problem.decentralized_optimization_single_buyer();
        print("Optimization Solution: ", solution)
        return jsonify({"solution": solution});
    except:
        print("Optimization was unsuccessful");
        raise OptimizationUnsuccessful('Optimization was unsuccessful');

# Resource: http://flask.pocoo.org/docs/1.0/patterns/apierrors/
class OptimizationUnsuccessful(Exception):
    status_code = 500

    def __init__(self, message, status_code=None, payload=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv

# Error handler
@app.errorhandler(OptimizationUnsuccessful)
def handle_invalid_usage(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

# Run the application on port 8081
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8081)
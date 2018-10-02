from pprint import pprint
import numpy as np
import scipy.optimize

class EnergyOptimization:
    def __init__(self, 
            nr_sellers, 
            buyer_demand, 
            sellers_price, 
            sellers_capacity, 
            used_capacities,
            hop_distrances_from_buyer):
        self.nr_sellers = nr_sellers;
        self.buyer_demand = buyer_demand;
        self.sellers_price = np.array(sellers_price, dtype='float64');
        self.sellers_capacity = np.array(sellers_capacity, dtype='float64');
        self.used_capacities = np.array(used_capacities, dtype='float64');
        self.remaining_capacities = self.sellers_capacity - self.used_capacities;
        self.hop_distrances_from_buyer = np.array(hop_distrances_from_buyer, dtype='float64');

    def decentralized_optimization_single_buyer(self):
        decentralized_result = scipy.optimize.minimize(
            self.decentralized_cost_function,
            np.zeros(self.nr_sellers), # Initial guess
            bounds=[(0, capacity) if capacity > 1.e-3 else (0, 0) for capacity in self.remaining_capacities],
            constraints=[
                {'type': 'eq', 'fun': lambda x: np.sum(x) - self.buyer_demand}
            ],
            options={'maxiter': 200, 'ftol': 1.e-3}
            ); 
        
        if not decentralized_result['success']:
            print(decentralized_result['message'], decentralized_result['nit'], 'iterations');
            
        assert decentralized_result['success'] == True; # Optimization was successful
        
        buyer_solution = decentralized_result['x'];

        nr_decimals = 4;
        solution_rounded = list(map(lambda x: round(x, nr_decimals), buyer_solution.tolist()))
        return solution_rounded;

    def decentralized_cost_function(self, x):
        sellers_used_capacity = self.used_capacities + x; # current load + the load from the current buyer;
        sellers_load = 1 + np.divide(sellers_used_capacity, self.sellers_capacity);
        
        transmission_cost_per_hop = 0.02;
        unit_cost = np.multiply(self.sellers_price, sellers_load) + transmission_cost_per_hop * self.hop_distrances_from_buyer;
        individual_cost = np.sum(np.multiply(unit_cost, x));
        return individual_cost;
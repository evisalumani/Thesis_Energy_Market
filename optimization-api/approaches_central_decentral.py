from pprint import pprint
import numpy as np
import scipy.optimize

class CentralizedResult:
    def __init__(self, system_cost, individual_costs, energy_transfers):
        self.system_cost = system_cost;
        self.individual_costs = individual_costs;
        self.energy_transfers = energy_transfers;

class DecentralizedResult(CentralizedResult):
    def __init__(self, 
                 system_cost, # final cost
                 individual_costs, # final costs
                 energy_transfers,
                 nr_iterations, 
                 system_cost_per_iteration, 
                 individual_cost_per_iteration):
        CentralizedResult.__init__(self, system_cost, individual_costs, energy_transfers);
        self.nr_iterations = nr_iterations;
        self.system_cost_per_iteration = system_cost_per_iteration;
        self.individual_cost_per_iteration = individual_cost_per_iteration;

class Game:
    def __init__(self, 
        nr_users, 
        sellers_percentage, 
        supply_low, 
        supply_high, 
        demand_low,
        demand_high,
        price_low,
        price_high,
        grid_price,
        random_input):
        
        # assign game attributes
        self.nr_users = nr_users;
        self.sellers_percentage = sellers_percentage;
        self.supply_low = supply_low;
        self.supply_high = supply_high;
        self.demand_low = demand_low;
        self.demand_high = demand_high;
        self.price_low = price_low;
        self.price_high = price_high;
        self.grid_price = grid_price;
        self.random_input = random_input;
        
        # calculate nr of buyers and sellers
        self.nr_sellers = int(np.floor(self.nr_users*self.sellers_percentage));
        self.nr_buyers = self.nr_users - self.nr_sellers;
        self.transmission_cost_per_hop = 0.02;
        
        # setup market supply (quantity, price) and market demand (quantity)
        self.setup_market();
    
    def setup_market(self):
        # set up supply (quantity and price)
        # [low, high) interval when generating random integers
        self.sellers_capacity = np.random.randint(low=self.supply_low,high=self.supply_high,size=self.nr_sellers); 
        # assume grid capacity is "infinite", i.e. it can cover the upper bound demand of all buyers
        self.grid_capacity = self.nr_buyers * self.demand_high;
        self.sellers_capacity = np.append(self.sellers_capacity, self.grid_capacity);    
        
        self.sellers_price = np.random.uniform(low=self.price_low,high=self.price_high,size=self.nr_sellers);
        self.sellers_price = np.append(self.sellers_price, self.grid_price);
        
        # set up demand (quantity)
        self.buyers_demand = np.random.randint(low=self.demand_low,high=self.demand_high,size=self.nr_buyers);
        
        # set up hop distances
        self.hop_distrances = np.random.randint(low=1,high=self.nr_sellers+1,size=(self.nr_buyers, self.nr_sellers + 1));
        # everyone is 1 hop away from the main grid
        self.hop_distrances[:,self.nr_sellers] = np.ones(self.nr_buyers);
        
    def start_simulation(self):
        self.centralized_optimization();
        self.decentralized_optimization();
        
    def centralized_optimization(self):
        initial_guess = np.zeros(self.nr_buyers*(self.nr_sellers + 1)); # initial guess of 0s
        
        centralized_result = scipy.optimize.minimize(
            self.centralized_cost_function, 
            initial_guess, 
            bounds=self.centralized_generate_bounds(), 
            constraints=self.centralized_generate_constraints(),
            options={'maxiter': 200, 'ftol': 1.e-3});
        
        if not centralized_result['success']:
            print(centralized_result['message']);
        assert centralized_result['success'] == True; # optimization was successful
        
        system_cost = centralized_result['fun'];
        system_solution = centralized_result['x'];
        
        energy_transfers = self.to_matrix(system_solution, (self.nr_buyers, self.nr_sellers + 1));
        
        load = 1 + np.divide(np.sum(energy_transfers, axis=0), self.sellers_capacity);
        
        unit_price_matrix = np.tile(np.multiply(self.sellers_price, load), (self.nr_buyers, 1)) + \
                            self.transmission_cost_per_hop * self.hop_distrances;
        system_cost_detailed = np.multiply(unit_price_matrix, energy_transfers);
        system_cost_by_buyer = np.sum(system_cost_detailed, axis=1);
        
        # Note: np.sum(system_cost_by_buyer) should equal centralized_result['fun']    
        
        print('system_cost from scipy', centralized_result['fun'], 'system_cost from calculations', np.sum(system_cost_by_buyer))
        return CentralizedResult(system_cost = system_cost, individual_costs = system_cost_by_buyer, energy_transfers = energy_transfers);
    
    def to_matrix(self, vector, shape):
        assert shape[0]*shape[1] == vector.size;
        return vector.reshape(shape);
    
    def centralized_cost_function(self, x):
        # x is the 1d vector to be optimized
        # x is converted to a matrix to make calculations/expressions easier
        matrix = self.to_matrix(x, (self.nr_buyers, self.nr_sellers+1));
    
        # load for each seller is expressed as (1 + fraction of used capacity)
        load = 1 + np.divide(np.sum(matrix, axis=0), self.sellers_capacity);
        
        unit_energy_cost = np.multiply(self.sellers_price, load); # unit energy cost by seller (excluding transmission)

        # represents the overall cost (including transmission) to buy a unit of energy from each seller
        # repeats the unit cost in rows for each buyer
        unit_cost_matrix = np.tile(unit_energy_cost, (self.nr_buyers, 1)) + \
                            self.transmission_cost_per_hop * self.hop_distrances;
                    
        cost_matrix = np.multiply(unit_cost_matrix, matrix);

        system_cost = np.sum(cost_matrix);
        
        return system_cost;
    
    def centralized_generate_bounds(self):
        # base bounds bounded by each seller's capacity
        bounds = [(0, capacity) for capacity in self.sellers_capacity];

        # repeat the bounds for each buyer
        return np.tile(bounds, (self.nr_buyers,1));

    def centralized_generate_constraints(self):
        constraints = [];
        # demand constraints (equalities)
        for i in range(self.buyers_demand.size):
            def f(x, i = i):
                return self.centralized_geneerate_demand_expressions(x)[i] - self.buyers_demand[i];
            
            constraints.append({'type': 'eq', 'fun': f});

        # supply constraints (inequalities)
        for j in range(self.sellers_capacity.size):
            def f(x, j = j):
                return (-1)*self.centralized_generate_supply_expressions(x)[j] + self.sellers_capacity[j];
            
            constraints.append({'type': 'ineq', 'fun': f});

        return constraints;

    def centralized_geneerate_demand_expressions(self, x):
        matrix = self.to_matrix(x, (self.nr_buyers, self.nr_sellers+1));
        return np.sum(matrix, axis=1); # sum across rows gives the demand of each buyer

    def centralized_generate_supply_expressions(self, x):
        matrix = self.to_matrix(x, (self.nr_buyers, self.nr_sellers+1));
        return np.sum(matrix, axis=0); # sum across columns gives the used capacity of each seler
    
    def decentralized_cost_function(self, x, *args):
        buyer_index = args[1];
        sellers_used_capacity = args[0] + x; # current load + the load from the current buyer;
        sellers_load = 1 + np.divide(sellers_used_capacity, self.sellers_capacity);
        
        unit_cost = np.multiply(self.sellers_price, sellers_load) + self.transmission_cost_per_hop * self.hop_distrances[buyer_index,:];
        individual_cost = np.sum(np.multiply(unit_cost, x));
        return individual_cost;
    
    def decentralized_optimization(self): 
        # represents the energy requested from buyers (rows) to sellers (columns) 
        energy_transfers = np.zeros((self.nr_buyers, self.nr_sellers+1));

        # initially, buyers buy everything from grid
        # Comment this to see the effect
        energy_transfers[:,self.nr_sellers] = self.buyers_demand;
    
        # tolerance parameter to indicate the closeness of a buyer's decision from two different iterations
        tolerance = 0.5; 

        iter_count = 0;
        max_iter = 50;
        
        previous_buyers_keep_playing = [True] * self.nr_buyers;
        
        # keep track of cost through the iterations
        system_cost_per_iteration = [];  # list of size self.nr_buyers
        individual_cost_per_iteration = []; # list (of size nr of iterations) of other lists
        
        # initially, buy everything from the grid
        grid_load = 1 + np.sum(self.buyers_demand) / self.grid_capacity; 
        # Note: everyone has 1 hop distance from the main grid
        grid_unit_cost = self.grid_price * grid_load + self.transmission_cost_per_hop * 1;
        system_cost_by_buyer = grid_unit_cost * self.buyers_demand;
        system_energy_cost = np.sum(system_cost_by_buyer);
        
        # update cost information
        individual_cost_per_iteration.append(system_cost_by_buyer);                          
        system_cost_per_iteration.append(system_energy_cost);
        
        while (True):
            iter_count = iter_count + 1;
            print('Iteration', iter_count)

            if iter_count == max_iter:
                print('max_iter reached => stop game')
                break;
            
            buyers_keep_playing = [True] * self.nr_buyers; # on each new iteration, set all buyers to playing

            # solve the local optimization problem for each buyer
            for b in range(self.nr_buyers):
                # a selector to select all except the row of the current buyer
                selector_row = [row_nr for row_nr in range(energy_transfers.shape[0]) if row_nr != b];
                other_buyers_transfers = energy_transfers[selector_row,:];
                other_buyers_transfers_aggregated = other_buyers_transfers.sum(axis=0); # sum across columns gives the requested capacity for each seller
                
                remaining_capacities = self.sellers_capacity - other_buyers_transfers_aggregated;
        
                # inequality constraint seems redundant, the bounds reflect the same
                # {'type': 'ineq', 'fun': lambda x: (-1)*other_buyers_transfers_aggregated - x + self.sellers_capacity}
                decentralized_result = scipy.optimize.minimize(
                    self.decentralized_cost_function,
                    np.zeros(self.nr_sellers + 1), # initial guess
                    args=(other_buyers_transfers_aggregated, b), # arguments passed to the objective function
                    bounds=[(0, capacity) if capacity > 1.e-3 else (0, 0) for capacity in remaining_capacities],
                    constraints=[
                        {'type': 'eq', 'fun': lambda x: np.sum(x)-self.buyers_demand[b]}
                    ],
                    options={'maxiter': 200, 'ftol': 1.e-3}
                    ); 
                
                if not decentralized_result['success']:
                    print(decentralized_result['message'], decentralized_result['nit'], 'iterations');
                    
                assert decentralized_result['success'] == True; # optimization was successful
                
                buyer_solution = decentralized_result['x'];

                is_solution_close = np.allclose(energy_transfers[b], buyer_solution, atol=tolerance);

                if is_solution_close:
                    print('Buyer #', b, ', solution is close:', energy_transfers[b], buyer_solution)
                    buyers_keep_playing[b] = False;
                else:
                    # update the buyer's strategy
                    energy_transfers[b] = buyer_solution;
                # End of the for-loop for buyers in the current game stage
                    
            # calculate individual and system cost for this game stage
            load = 1 + np.divide(np.sum(energy_transfers, axis=0), self.sellers_capacity);
            unit_energy_cost = np.multiply(self.sellers_price, load);
            unit_cost_matrix = np.tile(unit_energy_cost, (self.nr_buyers, 1)) + \
                            self.transmission_cost_per_hop * self.hop_distrances;
            cost_matrix = np.multiply(unit_cost_matrix, energy_transfers);
            system_cost_by_buyer = np.sum(cost_matrix, axis=1);
            system_energy_cost = np.sum(system_cost_by_buyer);
           
            # update cost information
            individual_cost_per_iteration.append(system_cost_by_buyer);                          
            system_cost_per_iteration.append(system_energy_cost);
            
            # to avoid fluctuating optimization results between buyers
            same_keep_playing = np.logical_and(previous_buyers_keep_playing, buyers_keep_playing);
            same_keep_playing_count = np.count_nonzero(same_keep_playing == True);
            same_keep_playing_idx = np.where(same_keep_playing == True)[0];
            if same_keep_playing_idx.size == 2:
                break;
#                 idx1, idx2 = same_keep_playing_idx[0], same_keep_playing_idx[1];
#                 buyers_keep_playing[idx1] = False;
#                 buyers_keep_playing[idx2] = False;
            
            # all players need to have their strategies unchanged, in order for the game to be finished
            print('Players: ', buyers_keep_playing)
            if not np.any(buyers_keep_playing):
                print('Game finished at #iter', iter_count);
                break;
                
            previous_buyers_keep_playing = buyers_keep_playing;
        
        # End of the game stages
        print('Iterations: ', iter_count)

        return DecentralizedResult( 
            system_cost = system_cost_per_iteration[-1], # cost of last game stage
            individual_costs = individual_cost_per_iteration[-1], # costs of last game stage
            energy_transfers = energy_transfers,
            nr_iterations = iter_count,
            system_cost_per_iteration = system_cost_per_iteration,
            individual_cost_per_iteration = individual_cost_per_iteration);


"""
# Invocation Example:
game = Game(
    nr_users = 10,
    sellers_percentage = 0.3, 
    supply_low = 10, 
    supply_high = 100, 
    demand_low = 10,
    demand_high = 50,
    price_low = 0.05,
    price_high = 0.09,
    grid_price = 0.14,
    random_input = False);

result = game.decentralized_optimization();
pprint(vars(result));
"""
package ml

import (
	"math"
)

var scalerMean = []float64{11176.0105, 16749.091666666667, 3623.8845, 2781.5008333333335, 1537.8975, 1098.2556666666667, 3906.255833333333, 5315.1195}
var scalerScale = []float64{6785.019313314916, 9938.240036273888, 2193.637298679923, 1770.574198200301, 2080.5836906968557, 1535.1491168508317, 2523.8327817790623, 5328.308970635344}

var centroids = [][]float64{
	{-0.7674196360069321, -0.7824916252090045, -0.7718333527850582, -0.7384836766554088, -0.35288750269531843, -0.35036233248188015, -0.7283432310807599, -0.45301145833394885},
	{0.2688777065228, 0.2713472854287572, 0.2663252901533364, 0.2639928140011767, 0.1129028086139365, 0.12198559111177468, 0.2584934021822232, 0.15519395006628695},
	{1.9142631133779102, 1.9593486190894724, 1.9361932849539571, 1.8280884864563036, 0.9088544056744773, 0.8759991038197547, 1.8079801910348394, 1.1393925126702613},
}

var clusterLabels = map[int]string{
	0: "Saver",
	1: "Balanced",
	2: "High Spender",
}

// PredictSpenderType classifies spender type using local K-Means centroids and scale factors
func PredictSpenderType(breakdown map[string]float64) string {
	x := []float64{
		breakdown["food_and_drink"],
		breakdown["rent"],
		breakdown["utilities"],
		breakdown["entertainment"],
		breakdown["travel"],
		breakdown["health_and_fitness"],
		breakdown["shopping"],
		breakdown["other"],
	}

	// Standardize inputs
	scaledX := make([]float64, 8)
	for i := 0; i < 8; i++ {
		scaledX[i] = (x[i] - scalerMean[i]) / scalerScale[i]
	}

	// Calculate Euclidean distance to each centroid
	minDist := math.MaxFloat64
	bestCluster := 0

	for clusterIdx, centroid := range centroids {
		distSum := 0.0
		for i := 0; i < 8; i++ {
			diff := scaledX[i] - centroid[i]
			distSum += diff * diff
		}
		dist := math.Sqrt(distSum)
		if dist < minDist {
			minDist = dist
			bestCluster = clusterIdx
		}
	}

	return clusterLabels[bestCluster]
}

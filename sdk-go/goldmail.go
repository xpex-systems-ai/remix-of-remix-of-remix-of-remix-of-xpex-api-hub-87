// Package goldmail provides the official Go SDK for XPEX Neural GoldMail Email Validation API.
//
// Example usage:
//
//	client := goldmail.NewClient("your-api-key")
//	result, err := client.Validate(context.Background(), "test@example.com")
//	if err != nil {
//		log.Fatal(err)
//	}
//	fmt.Printf("Valid: %v, Risk: %s\n", result.Valid, result.RiskLevel)
package goldmail

// Version is the current SDK version
const Version = "1.0.0"

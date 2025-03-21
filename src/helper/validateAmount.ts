
export const validateAmount = (isDrip: boolean, value: number, lowerBound: number, upperBound: number, decimals: number, tokenValue: number, tonBalance: number, jettonBalance: number) => {
    if (isNaN(value))
      return {
        status: false,
        message: "Incomplete Value"
      };
    if (!value)
      return {
        status: false,
        message: "No Value"
      };
    if (value < 0)
      return {
        status: false,
        message: "Negative Value"
      };
    if (isDrip) {
      if (value > tonBalance)
        return {
          status: false,
          message: "Insufficient Funds"
        };
      const amount = (value * tokenValue);
      console.log(amount)
      if (amount <= lowerBound)
        return {
          status: false,
          message: "Amount too low"
        };
      if (amount > upperBound)
        return {
          status: false,
          message: "Amount too big"
        };
      return {
        status: true,
        message: null
      };
    } else {
      //it's a refund
      if (value > jettonBalance)
        return {
          status: false,
          message: "Insufficient Funds"
        };
      if ((value * 10 ** decimals) > upperBound)
        return {
          status: false,
          message: "Amount too big"
        };
      return {
        status: true,
        message: null
      };
    }
  }
  
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { usePoints } from '@/hooks/usePoints';
import {
  CreditCard,
  AlertCircle,
  Check,
  Phone,
  Building,
  ArrowDownUp,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EXCHANGE_RATE = 100; // 100 points = $1

const PAYMENT_METHODS = {
  PAYPAL: 'PayPal',
  CREDIT_CARD: 'Credit Card',
  THAI_BANKS: 'Thai Banks',
  KBZ_PAY: 'KBZ Pay',
} as const;

type PaymentMethodType = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export default function WithdrawCashScreen() {
  const { points } = usePoints();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [amount, setAmount] = useState('');
  const [pointsInput, setPointsInput] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const paymentDetailsRef = useRef<View>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Effect to scroll to payment details when they become visible
  useEffect(() => {
    if (selectedMethod && detailsVisible) {
      setTimeout(() => {
        if (paymentDetailsRef.current && scrollViewRef.current) {
          // Use a more direct approach to scroll to the payment details
          scrollViewRef.current.scrollTo({
            y: 500, // Scroll to a position that will show the payment details
            animated: true
          });
        }
      }, 100);
    }
  }, [selectedMethod, detailsVisible]);

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    const requiredPoints = withdrawAmount * EXCHANGE_RATE;

    // console.log('Selected Method in handleWithdraw:', selectedMethod);

    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    if (!amount || withdrawAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (requiredPoints > points) {
      Alert.alert('Error', 'Insufficient points');
      return;
    }

    // Validate payment details based on method
    if (selectedMethod === PAYMENT_METHODS.PAYPAL && !paypalEmail) {
      Alert.alert('Error', 'Please enter PayPal email');
      return;
    }

    if (selectedMethod === PAYMENT_METHODS.CREDIT_CARD && 
        (!cardNumber || !cardExpiry || !cardCVV || !cardholderName)) {
      Alert.alert('Error', 'Please enter all card details');
      return;
    }

    if (selectedMethod === PAYMENT_METHODS.KBZ_PAY && (!phoneNumber || phoneNumber.length < 10)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Are you sure you want to withdraw $${withdrawAmount}?\nRequired points: ${requiredPoints}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success', 'Withdrawal request submitted successfully');
            // Reset all form fields
            setAmount('');
            setPaypalEmail('');
            setCardNumber('');
            setCardExpiry('');
            setCardCVV('');
            setCardholderName('');
            setPhoneNumber('');
            setBankAccountName('');
            setBankAccountNumber('');
            setSelectedBank('');
          },
        },
      ]
    );
  };

  const handleMethodSelect = (method: PaymentMethodType) => {
    // If clicking the same method again, deselect it
    if (selectedMethod === method) {
      setSelectedMethod(null);
      setDetailsVisible(false);
    } else {
      // Otherwise select the new method
      setSelectedMethod(method);
      setDetailsVisible(true);
      
      // Use two-step scroll with longer delay to ensure content is fully rendered
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
          // Second scroll after a brief delay to ensure we reach the bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 300);
        }
      }, 200);
    }
    
    // Reset form fields in either case
    setPaypalEmail('');
    setCardNumber('');
    setCardExpiry('');
    setCardCVV('');
    setCardholderName('');
    setPhoneNumber('');
    setBankAccountName('');
    setBankAccountNumber('');
    setSelectedBank('');
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    // Convert USD to points
    if (value) {
      const pointsValue = parseFloat(value) * EXCHANGE_RATE;
      setPointsInput(pointsValue.toString());
    } else {
      setPointsInput('');
    }
  };

  const handlePointsChange = (value: string) => {
    setPointsInput(value);
    // Convert points to USD
    if (value) {
      const usdValue = parseFloat(value) / EXCHANGE_RATE;
      setAmount(usdValue.toFixed(2));
    } else {
      setAmount('');
    }
  };

  const renderPaymentMethod = (
    method: PaymentMethodType,
    icon: React.ReactNode,
    subtitle: string
  ) => (
    <Pressable
      style={[
        styles.methodCard,
        selectedMethod === method && styles.selectedMethodCard
      ]}
      onPress={() => {
        handleMethodSelect(method);
        // No need for additional scroll here since handleMethodSelect handles it
      }}
    >
      <View style={styles.methodLeft}>
        {icon}
        <View>
          <Text style={styles.methodTitle}>{method}</Text>
          <Text style={styles.methodSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={[
        styles.methodCheck,
        selectedMethod === method && styles.selectedMethodCheck
      ]}>
        <Check
          size={16}
          color={selectedMethod === method ? '#1877F2' : 'transparent'}
        />
      </View>
    </Pressable>
  );

  return (
    <ScrollView
      ref={scrollViewRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.scrollContent,
        selectedMethod && { paddingBottom: 120 }
      ]}
      bounces={false}
    >
        {/* Amount Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amount (USD)</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#666"
          />
        </View>
        
        {/* Converter Icon */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
        }}>
          <View style={{
            height: 1,
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.1)',
          }} />
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: 10,
          }}>
            <ArrowDownUp size={18} color="#00ff00" />
          </View>
          <View style={{
            height: 1,
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.1)',
          }} />
        </View>
        
        {/* Points Converter */}
        <View style={styles.converterContainer}>
          <Text style={styles.converterLabel}>Points:</Text>
          <TextInput
            style={styles.converterInput}
            value={pointsInput}
            onChangeText={handlePointsChange}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#666"
          />
        </View>
        
        <Text style={styles.pointsRequired}>
          Available points: {points}
        </Text>
      </View>
      
      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        <View style={styles.methodsContainer}>
          {renderPaymentMethod(
            PAYMENT_METHODS.PAYPAL,
            <Image
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/1200px-PayPal.svg.png' }}
              style={styles.methodIcon}
            />,
            'Fast & secure payments'
          )}
          {renderPaymentMethod(
            PAYMENT_METHODS.CREDIT_CARD,
            <CreditCard size={24} color="#1877F2" />,
            'Visa, Mastercard, etc.'
          )}
          {renderPaymentMethod(
            PAYMENT_METHODS.THAI_BANKS,
            <Building size={24} color="#1877F2" />,
            'Local bank transfer'
          )}
          {renderPaymentMethod(
            PAYMENT_METHODS.KBZ_PAY,
            <Image
              source={require('@/assets/images/kbzpay.png')}
              style={styles.methodIcon}
            />,
            'Myanmar mobile payment'
          )}
        </View>
      </View>

      {/* Payment Details Section */}
      {selectedMethod && (
        <View 
          style={styles.section}
          ref={paymentDetailsRef}
          onLayout={() => setDetailsVisible(true)}
        >
          <Text style={styles.sectionTitle}>
            {selectedMethod === PAYMENT_METHODS.CREDIT_CARD ? 'Card Details' :
             selectedMethod === PAYMENT_METHODS.PAYPAL ? 'PayPal Details' :
             selectedMethod === PAYMENT_METHODS.THAI_BANKS ? 'Bank Details' :
             selectedMethod === PAYMENT_METHODS.KBZ_PAY ? 'KBZ Pay Details' : 'Payment Details'}
          </Text>
          
          {/* PayPal Form */}
          {selectedMethod === PAYMENT_METHODS.PAYPAL && (
            <View style={styles.accountInputContainer}>
              <TextInput
                style={styles.accountInput}
                placeholder="PayPal Email"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                value={paypalEmail}
                onChangeText={setPaypalEmail}
              />
            </View>
          )}

          {/* Credit Card Form */}
          {selectedMethod === PAYMENT_METHODS.CREDIT_CARD && (
            <View style={styles.accountInputContainer}>
              <TextInput
                style={styles.accountInput}
                placeholder="Card Number"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                maxLength={19}
                value={cardNumber}
                onChangeText={(text) => {
                  const formatted = text.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || text;
                  setCardNumber(formatted);
                }}
              />
              <View style={styles.cardDetailsRow}>
                <TextInput
                  style={[styles.accountInput, styles.cardDetailInput]}
                  placeholder="MM/YY"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  maxLength={5}
                  value={cardExpiry}
                  onChangeText={(text) => {
                    text = text.replace(/\D/g, '');
                    if (text.length >= 2) {
                      text = text.slice(0, 2) + '/' + text.slice(2);
                    }
                    setCardExpiry(text);
                  }}
                />
                <TextInput
                  style={[styles.accountInput, styles.cardDetailInput]}
                  placeholder="CVV"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  maxLength={3}
                  secureTextEntry
                  value={cardCVV}
                  onChangeText={setCardCVV}
                />
              </View>
              <TextInput
                style={styles.accountInput}
                placeholder="Cardholder Name"
                placeholderTextColor="#666"
                autoCapitalize="words"
                value={cardholderName}
                onChangeText={setCardholderName}
              />
            </View>
          )}

          {/* Thai Banks Form */}
          {selectedMethod === PAYMENT_METHODS.THAI_BANKS && (
            <View style={styles.accountInputContainer}>
              <View style={styles.bankSelectContainer}>
                <Pressable
                  style={[styles.bankOption, selectedBank === 'SCB' && styles.selectedBank]}
                  onPress={() => setSelectedBank('SCB')}
                >
                  <Text style={[styles.bankText, selectedBank === 'SCB' && styles.selectedBankText]}>SCB</Text>
                </Pressable>
                <Pressable
                  style={[styles.bankOption, selectedBank === 'KBank' && styles.selectedBank]}
                  onPress={() => setSelectedBank('KBank')}
                >
                  <Text style={[styles.bankText, selectedBank === 'KBank' && styles.selectedBankText]}>KBank</Text>
                </Pressable>
                <Pressable
                  style={[styles.bankOption, selectedBank === 'BBL' && styles.selectedBank]}
                  onPress={() => setSelectedBank('BBL')}
                >
                  <Text style={[styles.bankText, selectedBank === 'BBL' && styles.selectedBankText]}>BBL</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.accountInput}
                placeholder="Account Name"
                placeholderTextColor="#666"
                value={bankAccountName}
                onChangeText={setBankAccountName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.accountInput}
                placeholder="Account Number"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
              />
            </View>
          )}

          {/* KBZ Pay Form */}
          {selectedMethod === PAYMENT_METHODS.KBZ_PAY && (
            <View style={styles.accountInputContainer}>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.phonePrefix}>+95</Text>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="9 XXXX XXXX"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^\d]/g, '');
                    setPhoneNumber(cleaned);
                  }}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Withdraw Button */}
      <Pressable
        style={[
          styles.withdrawButton,
          (!selectedMethod || !amount) && styles.withdrawButtonDisabled
        ]}
        onPress={handleWithdraw}
        disabled={!selectedMethod || !amount}
      >
        <Text style={styles.withdrawButtonText}>Withdraw Now</Text>
      </Pressable>

      {/* Info Note */}
      <View style={styles.infoNote}>
        <AlertCircle size={16} color="#888" />
        <Text style={styles.infoText}>
          Withdrawal requests are processed within 24-48 hours
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  methodsContainer: {
    gap: 10,
  },
  methodCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#222',
  },
  selectedMethodCard: {
    borderColor: '#1877F2',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  methodTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  methodSubtitle: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  methodCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMethodCheck: {
    borderColor: '#1877F2',
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
  },
  amountInputContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  currencySymbol: {
    color: '#888',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 8,
  },
  amountInput: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    padding: 0,
  },
  pointsRequired: {
    color: 'rgba(238, 34, 34, 0.56)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  accountInputContainer: {
    gap: 10,
  },
  accountInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    borderWidth: 1,
    borderColor: '#222',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#=',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 15,
  },
  phonePrefix: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginRight: 10,
    paddingVertical: 15,
  },
  phoneInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    padding: 0,
    height: 50,
  },
  withdrawButton: {
    backgroundColor: '#1877F2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    marginHorizontal: 20,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  withdrawButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    opacity: 0.7,
    paddingHorizontal: 20,
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cardDetailInput: {
    flex: 1,
  },
  bankSelectContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  bankOption: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  selectedBank: {
    borderColor: '#1877F2',
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
  },
  bankText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  selectedBankText: {
    color: '#1877F2',
  },
  converterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  converterLabel: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginRight: 10,
  },
  converterInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    padding: 0,
  },
}); 
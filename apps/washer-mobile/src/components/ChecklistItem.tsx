import { Pressable, View, Text, StyleSheet } from 'react-native'

type Props = {
  label: string
  checked: boolean
  onToggle: () => void
}

export function ChecklistItem({ label, checked, onToggle }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.label, checked && styles.labelChecked]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 8,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1A2744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1A2744',
    borderColor: '#1A2744',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  labelChecked: {
    color: '#E8E5DF',
  },
})

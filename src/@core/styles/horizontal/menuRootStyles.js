const menuRootStyles = theme => {
  return {
    '& > ul': {
      display: 'flex',
      inlineSize: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'nowrap'
    },
    '& > ul > li': {
      flexShrink: 0
    },
    '& > ul > li:not(:last-of-type)': {
      marginInlineEnd: theme.spacing(1.5)
    }
  }
}

export default menuRootStyles

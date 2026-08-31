import Fade from '@mui/material/Fade'

const tooltip = {
  MuiTooltip: {
    defaultProps: {
      arrow: true,
      enterDelay: 250,
      leaveDelay: 80,
      placement: 'top',
      slots: { transition: Fade },
      slotProps: { transition: { timeout: 160 } }
    },
    styleOverrides: {
      tooltip: ({ theme }) => ({
        borderRadius: 'var(--mui-shape-customBorderRadius-sm)',
        fontSize: theme.typography.subtitle2.fontSize,
        lineHeight: 1.539,
        color: 'var(--mui-palette-customColors-tooltipText)',
        backgroundColor: 'var(--mui-palette-Tooltip-bg)',
        border: '1px solid rgb(var(--mui-palette-dividerChannel) / 0.7)',
        boxShadow: 'var(--mui-customShadows-sm)',
        paddingInline: theme.spacing(3),
        paddingBlock: 5
      }),
      arrow: {
        color: 'var(--mui-palette-Tooltip-bg)'
      },
      popper: {
        '&[data-popper-placement*="bottom"] .MuiTooltip-tooltip': {
          marginTop: '6px !important'
        },
        '&[data-popper-placement*="top"] .MuiTooltip-tooltip': {
          marginBottom: '6px !important'
        },
        '&[data-popper-placement*="left"] .MuiTooltip-tooltip': {
          marginRight: '6px !important'
        },
        '&[data-popper-placement*="right"] .MuiTooltip-tooltip': {
          marginLeft: '6px !important'
        }
      }
    }
  }
}

export default tooltip

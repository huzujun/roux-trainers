import React, { Fragment } from 'react'

import CubeSim from './CubeSim'
import { Divider, makeStyles, useTheme, FormControl, FormLabel, Typography, Button} from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import { FaceletCube, CubeUtil, Move } from '../lib/CubeLib';

import { AppState, Action, Config } from "../Types";
import clsx from 'clsx';
import { Face } from '../lib/Defs';
import { getActiveName } from '../lib/Selector';
import { MultiSelect } from './Select';


const useStyles = makeStyles(theme => ({
    container: {
      paddingTop: theme.spacing(0),
      paddingBottom: theme.spacing(2),
      backgroundColor: theme.palette.background.default
    },
    paper: {
      padding: theme.spacing(3),
      display: 'flex',
      overflow: 'auto',
      flexDirection: 'column',
    },
    fixedHeight: {
      height: 300,
    },
    canvasPaper: {
      padding: theme.spacing(0),
      display: 'flex',
      overflow: 'auto',
      flexDirection: 'column',
    },
    title : {
      flexGrow: 1,
    },
    prompt: {
      color: theme.palette.text.secondary,
    },
    button: {
      width: "100%"
    },

  }))


function CmllTrainerView(props: { state: AppState, dispatch: React.Dispatch<Action> } ) {
    let { state, dispatch } = props
    let cube = state.cube.state
    let classes = useStyles()
    const canvasPaper = clsx(classes.canvasPaper, classes.fixedHeight);
    let facelet = FaceletCube.from_cubie(cube)

    const theme = useTheme()
    const simBackground = getActiveName(state.config.theme) === "bright" ? "#eeeeef" : theme.palette.background.paper

    const cmll = (c: Config) => c.cmllSelector;
    const cmllauf = (c: Config) => c.cmllAufSelector;
    const trigger = (c: Config) => c.triggerSelector;
    const ori = (c: Config) => c.orientationSelector;

    const panel = (
      <Fragment>
        <MultiSelect {...{state, dispatch, select: cmll, label: "CMLL Case", noDialog: true}} />
        <MultiSelect {...{state, dispatch, select: cmllauf, label: "CMLL Auf", noDialog: true}} />
        <MultiSelect {...{state, dispatch, select: trigger, label: "SB Last Pair Trigger (Uncheck all for pure CMLL)", noDialog: true}} />
        <MultiSelect {...{state, dispatch, select: ori}} />
      </Fragment>
    )

    React.useEffect( () =>  {
      setReveal(false)
    }, [ state ])
    const [reveal, setReveal] = React.useState(false)
    const handleClick = () => {
      setReveal(true)
    }
    let alg = ""
    if (reveal && state.case.desc.length === 3) {
      const moves = Move.parse(state.case.desc[1].alg +state.case.desc[2].alg)
      let moves_c = Move.collapse(moves)
      if (moves_c.length > 0) {
        if (moves_c[0].name[0] === "U") {
          alg += "(" + moves_c[0].name + ") ";
          moves_c = moves_c.slice(1)
        }
        alg += Move.to_string(moves_c)
      }
    }
    return (
    <Box className={classes.container}>
    <Grid container >
      <Grid item xs={12} >
            <Paper className={canvasPaper}>
              <Box margin="auto">
              <CubeSim
                width={300}
                height={300}
                cube={facelet}
                colorScheme={CubeUtil.ori_to_color_scheme(props.state.cube.ori)}
                bgColor={simBackground}
                facesToReveal={[Face.L]}
              />
              </Box>
            </Paper>
      </Grid>
    </Grid>

    <Box height = {5}/>

    <Paper className={classes.paper} elevation={2}>
    <Grid container spacing={2}>
      <Grid item xs={3}>
      <Button onFocus={(evt) => evt.target.blur() } className={classes.button}
      size="medium" variant="contained" color="primary" onClick={handleClick}> { /* className={classes.margin}>  */ }
          Show
      </Button>
      </Grid>
      <Grid item xs={9}>
        <Box paddingBottom={1} lineHeight={1} >
          <Typography style={{whiteSpace: 'pre-line', fontSize: 18, fontWeight: 500}}>
            { alg }
          </Typography>
        </Box>

      </Grid>

    </Grid>
    </Paper>


    <Box height={20}/>
      <Divider/>
    <Box height={20}/>
    { panel }

    <Box height={20}/>
      <Divider/>
    <Box height={15}/>

    <Box>
    <FormControl component="fieldset" className={classes.prompt}>
      <FormLabel component="legend">
         Usage: Press space for next case. Enter to redo.
      </FormLabel>
      </FormControl>
    </Box>

    </Box>
    );
}

export default CmllTrainerView



import React, { PureComponent } from 'react'
import fuzzysort from 'fuzzysort'
import { FaArrowCircleRight } from 'react-icons/fa'
import { WanderingCubes } from 'better-react-spinkit'
import staeLogo from '../../stae.svg'

import './style.sass'

interface State {
  data: []
  results: []
  search: string
  loading: boolean
  error: boolean
}

export default class App extends PureComponent {
  state: State = {
    loading: true,
    error: false,
    data: [],
    results: [],
    search: ''
  }
  componentDidMount = () => {
    fetch('https://raw.githubusercontent.com/stevelacy/boundaries.search/master/list.json')
      .then((res) => res.json())
      .then((data) =>
        this.setState({ data, loading: false })
      )
      .catch((error) => this.setState({ error, loading: false }))
  }
  onSearch = (e: any) => {
    const results = fuzzysort.go(e.target.value, this.state.data, {
      keys: [ 'name', 'id', 'tag' ],
      allowTypo: false,
      threshold: -1000
    })
    this.setState({
      search: e.target.value,
      results: results.slice(0, 10)
    })
  }
  getPath = (id: string): string => {
    return `https://github.com/staeco/boundaries/blob/master/files/${id}.geojson`
  }
  renderResult = (result: Fuzzysort.KeyResult<any>) => {
    return <div key={result.obj.id} className="result">
      <a href={this.getPath(result.obj.id)} target="_blank">
        <div className="rows">
          <div className="row">
            {result.obj.name}
          </div>
          <div className="row">
            {result.obj.id}
          </div>
          <div className="row">
            {result.obj.tag}
          </div>
        </div>
        <div className="icon">
          <FaArrowCircleRight size={24} />
        </div>
      </a>
    </div>
  }
  renderFooter = () => {
    return <div className="footer">
      <div>
        <a href="https://stae.co" title="Made with ❤️ by Stae">
          <img className="logo" src={staeLogo} />
        </a>
      </div>
      <div>
        Boundaries are sourced from <a href="https://github.com/staeco/boundaries">github.com/staeco/boundaries</a>
      </div>
      <div>
        Content is licensed MIT
      </div>
    </div>
  }
  renderLoader = () => {
    return <div className="loader">
      <WanderingCubes size={150} color='white' />
      Loading boundary files...
    </div>
  }
  renderError = () => {
    return <div className="error">
      Error loading GeoJson list
    </div>
  }
  render = () => {
    console.log(this.state.data.length)
    if (this.state.loading) return this.renderLoader()
    return <div className="app">
      <div className="content">
        <img className="logo" src="https://raw.githubusercontent.com/staeco/boundaries/master/logos/white.png" />
        <div className="text">
          GeoJSON boundaries for Earth, masterfully formatted and normalized for your consumption.
        </div>
        <div className="text">
          Total # as of writing this: <div className="bold">83,945</div>
        </div>
        <input
          className="input"
          autoFocus
          placeholder="search boundaries (nyc, new york, etc...)"
          type="text"
          value={this.state.search}
          onChange={this.onSearch} />
        {this.state.results.map(this.renderResult)}
        {this.state.error && this.renderError()}
      </div>
      {this.renderFooter()}
    </div>
  }
}

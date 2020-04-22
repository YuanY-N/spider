
const fs = require('fs')

const request = require('syncrequest')
const cheerio = require('cheerio')

const log = console.log.bind(console)

class Movie {
    constructor() {

        this.Name = ''
        this.Score = 0
        this._quote = ''
        this.ranking = 0
        this.coverUrl = ''
    }
}

const clear = (movie) => {
    let m = movie
    let o = {
        name: m.Name,
        score: Number(m.Score),
        quote: m._quote,
        ranking: m.ranking,
        coverUrl: m.coverUrl,
        otherNames: m.otherNames,
        people: m.people
    }
    return o
}

const movieFromDiv = (div) => {

    let e = cheerio.load(div)

    let movie = new Movie()

    movie.Name = e('.title').text()
    movie.Score = e('.rating_num').text()
    movie._quote = e('.inq').text()

    let pic = e('.pic')

    movie.ranking = pic.find('em').text()

    movie.coverUrl = pic.find('img').attr('src')

    let other = e('.other').text()
    movie.otherNames = other.slice(3).split('/').join('|')

    let people = e('.star')
    let p = people.find('span').last().text()
    let len = p.length
    movie.people = Number(p.slice(0, len - 3))

    return clear(movie)
}

const ensurePath = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
}

const cachedUrl = (url) => {
    let dir = 'cached_html'
    ensurePath(dir)
    let cacheFile = dir + '/' + url.split('?')[1] + '.html'

    let exists = fs.existsSync(cacheFile)
    if (exists) {
        let data = fs.readFileSync(cacheFile)
        return data
    } else {
        let r = request.get.sync(url)
        let body = r.body
        fs.writeFileSync(cacheFile, body)
        return body
    }
}

const moviesFromUrl = (url) => {
    let body = cachedUrl(url)
    let e = cheerio.load(body)c
    let movieDivs = e('.item')
    let movies = []
    for (let i = 0; i < movieDivs.length; i++) {
        let div = movieDivs[i]
        let m = movieFromDiv(div)
        movies.push(m)
    }
    return movies
}

const saveMovie = (movies) => {
    let s = JSON.stringify(movies, null, 2)
    let path = 'douban.json'
    fs.writeFileSync(path, s)
}

const downloadCovers = (movies) => {
    let dir = 'covers'
    ensurePath(dir)
    for (let i = 0; i < movies.length; i++) {
        let m = movies[i]
        let url = m.coverUrl
        let path = dir + '/' + m.ranking + '_' + m.name.split('/')[0] + '.jpg'
        request.sync(url, {
            pipe: path
        })
    }
    log('保存完毕')
}

const __main = () => {
    let movies = []

    for (let i = 0; i < 10; i++) {
        let start = i * 25
        let url = `https://movie.douban.com/top250?start=${start}&filter=`
        let moviesInPage = moviesFromUrl(url)
        movies = [...movies, ...moviesInPage]
    }
    saveMovie(movies)
    downloadCovers(movies)
    log('抓取成功, 数据已经写入到 douban.json 中')
}

__main()